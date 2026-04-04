// src/modules/analysis/armoriq/armoriq.client.ts
// ArmorIQ security client — per-agent governance layer with policy gates, token lifecycle,
// quickVerify consistency checks, and degraded-mode reporting.
// Fail-safe: if ArmorIQ is unavailable/unconfigured, pipeline continues in degraded mode.
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArmorIQClient as ArmorIQSDK, IntentToken } from '@armoriq/sdk';

// ─── Audit / policy types ─────────────────────────────────────────────────────

export interface ArmorIQAuditEntry {
  action: string;
  result: 'allowed' | 'blocked' | 'bypassed';
  timestamp: string;
}

export interface PolicyDecision {
  agentName: string;
  decision: 'allowed' | 'blocked' | 'skipped';
  reason: string;
  timestamp: string;
}

export interface AgentAuditEntry {
  agentName: string;
  tokenId: string | null;
  tokenValid: boolean;
  startedAt: string;
  completedAt: string | null;
  outcome: 'success' | 'fallback' | 'blocked';
}

export interface QuickVerifyResult {
  executionVerified: boolean;       // did the pipeline run as authorized?
  reasoningScore: number;           // 0–1 composite consistency score
  hallucination: boolean;           // Agent 3 keySignals not grounded in input
  consistencyFlags: string[];       // human-readable issues found
  confidenceLevel: 'high' | 'medium' | 'low';
}

// ─── Main verification block (sent in response.security) ──────────────────────

export interface ArmorIQVerification {
  // Execution proof (ArmorIQ)
  executionVerified: boolean;
  planId?: string;
  intentTokenId?: string;
  planValidated: boolean;
  circuitOpen: boolean;
  degraded: boolean;
  degradedReason?: string;

  // Reasoning proof (quickVerify)
  reasoningScore: number;
  hallucination: boolean;
  consistencyFlags: string[];
  confidenceLevel: 'high' | 'medium' | 'low';

  // Single flag: executionVerified && reasoningScore >= 0.7 && !hallucination
  verified: boolean;
  outputVerified: boolean;

  // Audit
  auditTrail: ArmorIQAuditEntry[];
  policyDecisions: PolicyDecision[];
  agentAuditEntries: AgentAuditEntry[];
  agentTokenIds: Record<string, string>;
}

// ─── Client ───────────────────────────────────────────────────────────────────

@Injectable()
export class ArmorIQClient {
  private readonly logger = new Logger(ArmorIQClient.name);
  private sdk: ArmorIQSDK | null = null;

  // Per-request token store (agentName → full IntentToken)
  private activeTokens = new Map<string, IntentToken>();

  // Circuit breaker state
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;
  private readonly CIRCUIT_THRESHOLD = 3;
  private readonly CIRCUIT_OPEN_MS = 60_000;

  constructor(private readonly config: ConfigService) {
    const apiKey  = this.config.get<string>('ARMORIQ_API_KEY') ?? '';
    const userId  = this.config.get<string>('ARMORIQ_USER_ID') ?? 'default-user';
    const agentId = this.config.get<string>('ARMORIQ_AGENT_ID') ?? 'sentiment-agent-v1';
    const proxy   = this.config.get<string>('ARMORIQ_PROXY_URL') ?? 'https://customer-proxy.armoriq.ai';

    if (apiKey && apiKey.startsWith('ak_live_')) {
      try {
        this.sdk = new ArmorIQSDK({
          apiKey,
          userId,
          agentId,
          proxyEndpoint: proxy,
          timeout: 30000,
          maxRetries: 3,
        });
        this.logger.log('🛡️  ArmorIQ client initialized');
      } catch (err) {
        this.logger.warn(`⚠️  ArmorIQ SDK init failed: ${(err as Error).message}`);
        this.sdk = null;
      }
    } else {
      this.logger.warn('⚠️  ARMORIQ_API_KEY not configured — running in degraded mode');
    }
  }

  isAvailable(): boolean {
    if (!this.sdk) return false;
    if (Date.now() < this.circuitOpenUntil) return false;
    return true;
  }

  // ─── Per-agent token issuance ──────────────────────────────────────────────

  /**
   * Issue a single-step plan token for one agent, with its own policy manifest
   * and validity window. Stores the full IntentToken for later verifyAgentToken().
   */
  async captureAgentPlan(
    agentName: string,
    tool: string,
    description: string,
    policy: Record<string, any>,
    validitySeconds: number,
  ): Promise<{ tokenId: string | null; planId: string | null }> {
    if (!this.isAvailable() || !this.sdk) return { tokenId: null, planId: null };

    try {
      const plan = {
        goal: `Execute ${agentName} in sentiment analysis pipeline`,
        steps: [{ action: tool, mcp: 'sentiment-analysis-pipeline', description, params: {} }],
      };
      const planCapture = this.sdk.capturePlan(agentName, description, plan);
      const intentToken = await this.sdk.getIntentToken(planCapture, policy, validitySeconds);

      const tokenId = intentToken.tokenId ?? null;
      const planId  = (intentToken as any).planId ?? null;

      if (tokenId) {
        this.activeTokens.set(agentName, intentToken);
        this.consecutiveFailures = 0;
        this.logger.log(
          `🛡️  [${agentName}] token issued — id=${tokenId} planId=${planId} ttl=${validitySeconds}s`,
        );
      }
      return { tokenId, planId };
    } catch (err) {
      this.handleFailure(err as Error);
      return { tokenId: null, planId: null };
    }
  }

  // ─── Pre-execution token validation ───────────────────────────────────────

  /**
   * Check local expiry, then remote verify. Fail-open on network error
   * so ArmorIQ availability never gates agent execution.
   */
  async verifyAgentToken(agentName: string): Promise<boolean> {
    if (!this.isAvailable() || !this.sdk) return true; // fail-open

    const token = this.activeTokens.get(agentName);
    if (!token) return false;

    // Local expiry check (free, no network)
    const isExpired = (token as any).expiresAt < Date.now() / 1000;
    if (isExpired) {
      this.logger.warn(`⏰  [${agentName}] ArmorIQ token expired`);
      return false;
    }

    try {
      const valid = await this.sdk.verifyToken(token);
      if (!valid) this.logger.warn(`🚫  [${agentName}] ArmorIQ token failed remote verification`);
      return valid;
    } catch {
      return true; // fail-open: ArmorIQ network error must not block agents
    }
  }

  // ─── Mid-pipeline audit event ──────────────────────────────────────────────

  /**
   * Call updatePlanStatus('active') after each agent completes.
   * This creates a mid-pipeline event visible on the ArmorIQ dashboard.
   */
  async recordAgentComplete(
    planId: string,
    agentName: string,
    outcome: 'success' | 'fallback',
  ): Promise<void> {
    if (!this.isAvailable() || !this.sdk) return;
    try {
      await this.sdk.updatePlanStatus(planId, 'active');
      this.logger.log(`📋  ArmorIQ plan ${planId} — ${agentName} ${outcome}`);
    } catch (err) {
      this.handleFailure(err as Error);
    }
  }

  // ─── Synchronous policy gate (no network) ─────────────────────────────────

  /**
   * Evaluate a boolean condition as a policy gate. Returns a PolicyDecision
   * that is recorded in the audit trail. No network call.
   */
  evaluatePolicyGate(agentName: string, condition: boolean, reason: string): PolicyDecision {
    const decision: PolicyDecision = {
      agentName,
      decision: condition ? 'allowed' : 'blocked',
      reason,
      timestamp: new Date().toISOString(),
    };
    if (!condition) {
      this.logger.warn(`🚫  Policy gate BLOCKED ${agentName}: ${reason}`);
    }
    return decision;
  }

  // ─── Plan finalization ─────────────────────────────────────────────────────

  /**
   * Mark the plan completed (execution + reasoning passed) or failed
   * (reasoning inconsistent or hallucination detected).
   */
  async finalizePlan(planId: string, outcome: 'completed' | 'failed'): Promise<void> {
    if (!this.isAvailable() || !this.sdk) return;
    try {
      if (outcome === 'completed') {
        await this.sdk.completePlan(planId);
        this.logger.log(`✅  ArmorIQ plan ${planId} marked completed`);
      } else {
        await this.sdk.updatePlanStatus(planId, 'failed');
        this.logger.log(`❌  ArmorIQ plan ${planId} marked failed`);
      }
    } catch (err) {
      this.handleFailure(err as Error);
    }
  }

  // ─── Verification block builders ──────────────────────────────────────────

  /**
   * Build the rich verification block that combines execution proof (ArmorIQ)
   * with reasoning proof (quickVerify). Used on the happy path.
   */
  buildEnhancedVerification(params: {
    masterTokenId:     string | null;
    masterPlanId:      string | null;
    agentAuditEntries: AgentAuditEntry[];
    policyDecisions:   PolicyDecision[];
    agentTokenIds:     Record<string, string>;
    pipelineStatus:    'full' | 'partial' | 'mock';
    quickVerify:       QuickVerifyResult;
  }): ArmorIQVerification {
    const planValidated = params.masterTokenId !== null;
    const executionOk   = planValidated && params.pipelineStatus !== 'mock';
    const verified      =
      executionOk &&
      params.quickVerify.reasoningScore >= 0.7 &&
      !params.quickVerify.hallucination;

    const auditTrail: ArmorIQAuditEntry[] = [
      {
        action: 'pipeline_start',
        result: planValidated ? 'allowed' : 'blocked',
        timestamp: new Date().toISOString(),
      },
      ...params.agentAuditEntries.map(e => ({
        action: `${e.agentName}_execution`,
        result: (e.outcome === 'blocked' ? 'blocked' : 'allowed') as 'allowed' | 'blocked' | 'bypassed',
        timestamp: e.completedAt ?? e.startedAt,
      })),
      ...params.policyDecisions
        .filter(d => d.decision === 'blocked')
        .map(d => ({
          action: `policy_gate_${d.agentName}`,
          result: 'blocked' as const,
          timestamp: d.timestamp,
        })),
      {
        action: 'quick_verify',
        result: params.quickVerify.reasoningScore >= 0.7 ? 'allowed' : 'blocked',
        timestamp: new Date().toISOString(),
      },
    ];

    return {
      executionVerified: executionOk,
      verified,
      planId:            params.masterPlanId ?? undefined,
      intentTokenId:     params.masterTokenId ?? undefined,
      planValidated,
      outputVerified:    params.pipelineStatus === 'full',
      circuitOpen:       false,
      degraded:          false,
      reasoningScore:    params.quickVerify.reasoningScore,
      hallucination:     params.quickVerify.hallucination,
      consistencyFlags:  params.quickVerify.consistencyFlags,
      confidenceLevel:   params.quickVerify.confidenceLevel,
      auditTrail,
      policyDecisions:   params.policyDecisions,
      agentAuditEntries: params.agentAuditEntries,
      agentTokenIds:     params.agentTokenIds,
    };
  }

  /**
   * Build a degraded verification block when ArmorIQ is unavailable or circuit open.
   * Pipeline continues, but the response is honest about the lack of verification.
   */
  buildBypassVerification(circuitOpen: boolean): ArmorIQVerification {
    return {
      executionVerified: false,
      verified:          false,
      planValidated:     false,
      outputVerified:    false,
      circuitOpen,
      degraded:          true,
      degradedReason:    circuitOpen
        ? 'ArmorIQ circuit breaker is open — too many consecutive failures'
        : 'ArmorIQ not configured — ARMORIQ_API_KEY missing or invalid',
      reasoningScore:    0,
      hallucination:     false,
      consistencyFlags:  ['ArmorIQ unavailable — execution not cryptographically verified'],
      confidenceLevel:   'low',
      auditTrail: [{
        action:    'verification_bypassed',
        result:    'bypassed',
        timestamp: new Date().toISOString(),
      }],
      policyDecisions:   [],
      agentAuditEntries: [],
      agentTokenIds:     {},
    };
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  private handleFailure(err: Error): void {
    this.consecutiveFailures++;
    this.logger.warn(`ArmorIQ failure ${this.consecutiveFailures}/${this.CIRCUIT_THRESHOLD}: ${err.message}`);
    if (this.consecutiveFailures >= this.CIRCUIT_THRESHOLD) {
      this.circuitOpenUntil = Date.now() + this.CIRCUIT_OPEN_MS;
      this.logger.warn(`🔴 ArmorIQ circuit OPEN for ${this.CIRCUIT_OPEN_MS / 1000}s`);
    }
  }
}
