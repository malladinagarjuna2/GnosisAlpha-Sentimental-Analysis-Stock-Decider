// src/modules/analysis/armoriq/armoriq.client.ts
// ArmorIQ security client — uses official @armoriq/sdk for cryptographic intent verification.
// Fail-safe: if ArmorIQ is unavailable/unconfigured, the pipeline continues unverified.
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArmorIQClient as ArmorIQSDK } from '@armoriq/sdk';

export interface ArmorIQAuditEntry {
  action: string;
  result: 'allowed' | 'blocked' | 'bypassed';
  timestamp: string;
}

export interface ArmorIQVerification {
  verified: boolean;
  intentTokenId?: string;
  planValidated: boolean;
  outputVerified: boolean;
  auditTrail: ArmorIQAuditEntry[];
  circuitOpen: boolean;
}

@Injectable()
export class ArmorIQClient {
  private readonly logger = new Logger(ArmorIQClient.name);
  private sdk: ArmorIQSDK | null = null;

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
      this.logger.warn('⚠️  ARMORIQ_API_KEY not configured — verification will be bypassed');
    }
  }

  isAvailable(): boolean {
    if (!this.sdk) return false;
    if (Date.now() < this.circuitOpenUntil) return false;
    return true;
  }

  /** Capture a 3-agent plan and get a cryptographic intent token */
  async capturePlan(steps: { tool: string; description: string }[]): Promise<string | null> {
    if (!this.isAvailable() || !this.sdk) return null;

    try {
      const plan = {
        goal: 'Perform multi-agent market sentiment analysis',
        steps: steps.map((s, i) => ({
          action: s.tool,
          mcp: 'sentiment-analysis-pipeline',
          description: s.description,
          params: { stepIndex: i },
        })),
      };

      const planCapture = this.sdk.capturePlan(
        'gemini-2.0-flash + gpt-4o-mini',
        'Analyze market sentiment using 3-agent LLM pipeline',
        plan,
      );

      const intentToken = await this.sdk.getIntentToken(planCapture);
      const tokenId = intentToken.tokenId ?? null;

      if (tokenId) {
        this.consecutiveFailures = 0;
        this.logger.log(`🛡️  ArmorIQ intent token issued — tokenId=${tokenId}`);
      }

      return tokenId;
    } catch (err) {
      this.handleFailure(err as Error);
      return null;
    }
  }

  /** Build a bypass verification block (when ArmorIQ is unconfigured or circuit open) */
  buildBypassVerification(circuitOpen: boolean): ArmorIQVerification {
    return {
      verified:       false,
      planValidated:  false,
      outputVerified: false,
      circuitOpen,
      auditTrail: [{
        action:    'verification_bypassed',
        result:    'bypassed',
        timestamp: new Date().toISOString(),
      }],
    };
  }

  /** Build a full verification block after successful token issuance */
  buildVerification(intentTokenId: string | null, planValidated: boolean): ArmorIQVerification {
    return {
      verified:       planValidated,
      intentTokenId:  intentTokenId ?? undefined,
      planValidated,
      outputVerified: planValidated,
      circuitOpen:    false,
      auditTrail: [
        { action: 'plan_capture',  result: planValidated ? 'allowed' : 'blocked', timestamp: new Date().toISOString() },
        { action: 'intent_token',  result: planValidated ? 'allowed' : 'blocked', timestamp: new Date().toISOString() },
      ],
    };
  }

  private handleFailure(err: Error): void {
    this.consecutiveFailures++;
    this.logger.warn(`ArmorIQ failure ${this.consecutiveFailures}/${this.CIRCUIT_THRESHOLD}: ${err.message}`);
    if (this.consecutiveFailures >= this.CIRCUIT_THRESHOLD) {
      this.circuitOpenUntil = Date.now() + this.CIRCUIT_OPEN_MS;
      this.logger.warn(`🔴 ArmorIQ circuit OPEN for ${this.CIRCUIT_OPEN_MS / 1000}s`);
    }
  }
}
