// src/modules/analysis/analysis.service.ts
// STEP 10+: On-demand 3-agent multi-LLM deep analysis pipeline.
// Pipeline: Agent1(Gemini) → Agent2(OpenAI) → Agent3(Gemini) → quickVerify → score in CODE
// NEVER runs automatically — only triggered by POST /analysis/deep
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SentimentAgent } from './agents/sentiment.agent';
import { RiskAgent } from './agents/risk.agent';
import { ExplanationAgent } from './agents/explanation.agent';
import { ArmorIQClient } from './armoriq/armoriq.client';
import {
  SentimentAgentResult,
  RiskAgentResult,
  ExplanationAgentResult,
  DEFAULT_SENTIMENT_RESULT,
  DEFAULT_RISK_RESULT,
  AgentTrace,
} from './agents/agent.interfaces';
import type {
  ArmorIQVerification,
  PolicyDecision,
  AgentAuditEntry,
  QuickVerifyResult,
} from './armoriq/armoriq.client';

export interface DeepAnalysisResult {
  // ── Core fields ───────────────────────────────────────────────────────────
  postId:          string;
  summary:         string;
  sentiment:       'BULLISH' | 'BEARISH' | 'NEUTRAL';
  reasoning:       string;
  keyThemes:       string[];
  riskLevel:       'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  recommendation:  string;
  analyzedAt:      string;
  // ── Extended fields ───────────────────────────────────────────────────────
  confidenceScore: number;
  sentimentScore:  number;
  pipelineStatus:  'full' | 'partial' | 'mock';
  agentTrace?:     AgentTrace;
  security?:       ArmorIQVerification;
}

// ─── Per-agent policy manifests ───────────────────────────────────────────────
// Passed to getIntentToken() — stored cryptographically on ArmorIQ servers,
// documenting exactly what each agent was authorized to do.
const AGENT1_POLICY = {
  allowed_tools:  ['sentiment_analysis'],
  pipeline_stage: 'input_classification',
  enforcement:    'audit',
};
const AGENT2_POLICY = {
  allowed_tools:      ['risk_detection'],
  pipeline_stage:     'risk_evaluation',
  min_relevance_score: 0.3,
  enforcement:        'audit',
};
const AGENT3_POLICY = {
  allowed_tools:  ['explanation'],
  pipeline_stage: 'output_generation',
  blocked_if:     ['HIGH_RISK', 'PUMP_AND_DUMP'],
  enforcement:    'block',
};

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly prisma:           PrismaService,
    private readonly sentimentAgent:   SentimentAgent,
    private readonly riskAgent:        RiskAgent,
    private readonly explanationAgent: ExplanationAgent,
    private readonly armoriq:          ArmorIQClient,
  ) {}

  // ─── Public: analyze by postId ────────────────────────────────────────────

  async deepAnalyze(postId: string): Promise<DeepAnalysisResult> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException(`Post [${postId}] not found`);

    const nlpResult = await this.prisma.sentimentResult.findUnique({ where: { postId } });
    this.logger.log(`🔍 Deep analysis started for post [${postId}]`);

    const { result, qv } = await this.runPipeline(
      postId,
      post.content,
      async (content) => this.sentimentAgent.analyze(content, nlpResult),
    );

    this.logger.log(
      `✅ Deep analysis complete [${postId}] — ` +
      `sentiment=${result.sentiment} confidence=${result.confidenceScore.toFixed(2)} ` +
      `pipeline=${result.pipelineStatus} armoriq=${result.security?.verified ?? false} ` +
      `reasoning=${qv.reasoningScore.toFixed(2)} degraded=${result.security?.degraded ?? true}`,
    );
    return result;
  }

  // ─── Public: analyze raw text ─────────────────────────────────────────────

  async deepAnalyzeText(text: string, asset: string): Promise<DeepAnalysisResult> {
    const fakePostId = `text-${Date.now()}`;
    this.logger.log(`🔍 Deep analysis started for text [${asset}]`);

    const { result, qv } = await this.runPipeline(
      fakePostId,
      text,
      async (content) => this.sentimentAgent.analyze(content, null),
    );

    this.logger.log(
      `✅ Deep analysis complete [text/${asset}] — ` +
      `sentiment=${result.sentiment} pipeline=${result.pipelineStatus} ` +
      `reasoning=${qv.reasoningScore.toFixed(2)}`,
    );
    return result;
  }

  // ─── Core pipeline ────────────────────────────────────────────────────────

  private async runPipeline(
    postId: string,
    content: string,
    runAgent1: (content: string) => Promise<SentimentAgentResult>,
  ): Promise<{ result: DeepAnalysisResult; qv: QuickVerifyResult }> {

    let pipelineStatus: 'full' | 'partial' | 'mock' = 'full';

    // Tracking vars (replace the old single intentTokenId)
    const agentAuditEntries: AgentAuditEntry[]    = [];
    const policyDecisions:   PolicyDecision[]      = [];
    const agentTokenIds:     Record<string,string> = {};
    let   masterTokenId:     string | null         = null;
    let   masterPlanId:      string | null         = null;

    // ── Agent 1: Sentiment (Gemini) ─────────────────────────────────────────
    const a1Start = new Date().toISOString();
    let a1TokenId: string | null = null;
    let a1PlanId:  string | null = null;
    let a1TokenValid = true;

    if (this.armoriq.isAvailable()) {
      ({ tokenId: a1TokenId, planId: a1PlanId } = await this.armoriq.captureAgentPlan(
        'SentimentAgent', 'sentiment_analysis',
        'Classify sentiment, relevance, tweet type, and matched keywords for the post',
        AGENT1_POLICY, 120,
      ));
      masterTokenId = a1TokenId;
      masterPlanId  = a1PlanId;
      if (a1TokenId) agentTokenIds['SentimentAgent'] = a1TokenId;
      a1TokenValid = await this.armoriq.verifyAgentToken('SentimentAgent');
    }

    policyDecisions.push(this.armoriq.evaluatePolicyGate(
      'SentimentAgent', a1TokenValid,
      a1TokenValid ? 'Token valid, proceeding' : 'Token invalid or expired',
    ));

    let agent1: SentimentAgentResult;
    let a1Outcome: AgentAuditEntry['outcome'] = 'success';
    try {
      agent1 = await runAgent1(content);
    } catch (err) {
      this.logger.warn(`Agent 1 exception: ${(err as Error).message}`);
      agent1 = DEFAULT_SENTIMENT_RESULT;
      pipelineStatus = 'partial';
      a1Outcome = 'fallback';
    }

    agentAuditEntries.push({
      agentName: 'SentimentAgent', tokenId: a1TokenId, tokenValid: a1TokenValid,
      startedAt: a1Start, completedAt: new Date().toISOString(), outcome: a1Outcome,
    });
    if (a1PlanId) {
      await this.armoriq.recordAgentComplete(a1PlanId, 'SentimentAgent',
        a1Outcome === 'success' ? 'success' : 'fallback');
    }

    // ── Agent 2: Risk (OpenAI) ──────────────────────────────────────────────
    const a2Start = new Date().toISOString();
    let a2TokenId: string | null = null;
    let a2PlanId:  string | null = null;
    let a2TokenValid = true;

    if (this.armoriq.isAvailable()) {
      ({ tokenId: a2TokenId, planId: a2PlanId } = await this.armoriq.captureAgentPlan(
        'RiskAgent', 'risk_detection',
        'Detect sarcasm, manipulation, pump-and-dump signals, and emotional manipulation',
        AGENT2_POLICY, 90,
      ));
      if (a2TokenId) agentTokenIds['RiskAgent'] = a2TokenId;
    }

    // Policy gate: skip risk analysis for irrelevant content
    const a2Allowed = agent1.relevanceScore > 0.3;
    if (a2Allowed && this.armoriq.isAvailable()) {
      a2TokenValid = await this.armoriq.verifyAgentToken('RiskAgent');
    }
    policyDecisions.push(this.armoriq.evaluatePolicyGate(
      'RiskAgent', a2Allowed,
      a2Allowed
        ? 'Relevance score sufficient for risk analysis'
        : `Skipped: relevanceScore=${agent1.relevanceScore.toFixed(2)} < 0.3 — irrelevant content`,
    ));

    let agent2: RiskAgentResult;
    let a2Outcome: AgentAuditEntry['outcome'] = 'success';

    if (!a2Allowed) {
      // Policy-skipped: use a lighter penalty than the full default
      agent2 = DEFAULT_RISK_RESULT(agent1.confidence * 0.8);
      a2Outcome = 'blocked';
    } else {
      try {
        agent2 = await this.riskAgent.analyze(content, agent1);
      } catch (err) {
        this.logger.warn(`Agent 2 exception: ${(err as Error).message}`);
        agent2 = DEFAULT_RISK_RESULT(agent1.confidence);
        pipelineStatus = 'partial';
        a2Outcome = 'fallback';
      }
    }

    agentAuditEntries.push({
      agentName: 'RiskAgent', tokenId: a2TokenId, tokenValid: a2TokenValid,
      startedAt: a2Start, completedAt: new Date().toISOString(), outcome: a2Outcome,
    });
    if (a2PlanId) {
      await this.armoriq.recordAgentComplete(a2PlanId, 'RiskAgent',
        a2Outcome === 'success' ? 'success' : 'fallback');
    }

    // ── Agent 3: Explanation (Gemini) ───────────────────────────────────────
    const a3Start = new Date().toISOString();
    let a3TokenId: string | null = null;
    let a3PlanId:  string | null = null;
    let a3TokenValid = true;

    if (this.armoriq.isAvailable()) {
      ({ tokenId: a3TokenId, planId: a3PlanId } = await this.armoriq.captureAgentPlan(
        'ExplanationAgent', 'explanation',
        'Generate human-readable summary, reasoning, key signals, and recommendation',
        AGENT3_POLICY, 60,
      ));
      if (a3TokenId) agentTokenIds['ExplanationAgent'] = a3TokenId;
    }

    // Policy gate: block Agent 3 for HIGH risk or pump-and-dump content
    const a3BlockedByRisk = agent2.riskLevel === 'HIGH' || agent2.pumpAndDumpSignals;
    const a3Allowed = !a3BlockedByRisk;
    const a3GateReason = a3BlockedByRisk
      ? `Risk gate: riskLevel=${agent2.riskLevel} pumpAndDump=${agent2.pumpAndDumpSignals}`
      : 'Risk within acceptable bounds';

    if (a3Allowed && this.armoriq.isAvailable()) {
      a3TokenValid = await this.armoriq.verifyAgentToken('ExplanationAgent');
    }
    policyDecisions.push(this.armoriq.evaluatePolicyGate('ExplanationAgent', a3Allowed, a3GateReason));

    let agent3: ExplanationAgentResult;
    let a3Outcome: AgentAuditEntry['outcome'] = 'success';

    if (!a3Allowed) {
      // ArmorIQ-blocked: return a safe canned response instead of LLM explanation
      a3Outcome = 'blocked';
      agent3 = {
        summary:        `Analysis blocked: content flagged as ${agent2.riskLevel} risk.`,
        reasoning:      `ArmorIQ policy gate prevented explanation. ${a3GateReason}`,
        keySignals:     agent2.riskFlags.slice(0, 3),
        recommendation: 'Do not act on this signal. Independent verification required.',
      };
    } else {
      try {
        agent3 = await this.explanationAgent.analyze(content, agent1, agent2);
      } catch (err) {
        this.logger.warn(`Agent 3 exception: ${(err as Error).message}`);
        agent3 = {
          summary:        `${agent1.asset} post with ${agent1.sentimentScore > 0 ? 'bullish' : 'bearish'} signals.`,
          reasoning:      agent2.riskFlags.join('. ') || 'No risk flags detected.',
          keySignals:     [...agent1.matchedKeywords.slice(0, 2), ...agent2.riskFlags.slice(0, 2)],
          recommendation: 'Monitor for confirmation before acting.',
        };
        pipelineStatus = 'partial';
        a3Outcome = 'fallback';
      }
    }

    agentAuditEntries.push({
      agentName: 'ExplanationAgent', tokenId: a3TokenId, tokenValid: a3TokenValid,
      startedAt: a3Start, completedAt: new Date().toISOString(), outcome: a3Outcome,
    });
    if (a3PlanId) {
      await this.armoriq.recordAgentComplete(a3PlanId, 'ExplanationAgent',
        a3Outcome === 'success' ? 'success' : 'fallback');
    }

    // ── Final scoring (in code, not LLM) ────────────────────────────────────
    const result = this.computeFinalResult(postId, agent1, agent2, agent3, pipelineStatus);

    // ── quickVerify: rule-based consistency + grounding checks ──────────────
    const qv = this.quickVerify(content, agent1, agent2, agent3, result.pipelineStatus);

    // ── Finalize ArmorIQ plan (gated on combined execution + reasoning) ──────
    const planSucceeded =
      qv.executionVerified &&
      qv.reasoningScore >= 0.7 &&
      !qv.hallucination;

    if (masterPlanId) {
      await this.armoriq.finalizePlan(masterPlanId, planSucceeded ? 'completed' : 'failed');
    }

    // ── Build security block ─────────────────────────────────────────────────
    if (this.armoriq.isAvailable() && masterTokenId) {
      result.security = this.armoriq.buildEnhancedVerification({
        masterTokenId,
        masterPlanId,
        agentAuditEntries,
        policyDecisions,
        agentTokenIds,
        pipelineStatus: result.pipelineStatus,
        quickVerify: qv,
      });
    } else {
      result.security = this.armoriq.buildBypassVerification(!this.armoriq.isAvailable());
    }

    return { result, qv };
  }

  // ─── quickVerify: rule-based consistency + grounding checks ───────────────
  // No LLM call, no network. Deterministic and fast.

  private quickVerify(
    content:        string,
    agent1:         SentimentAgentResult,
    agent2:         RiskAgentResult,
    agent3:         ExplanationAgentResult,
    pipelineStatus: 'full' | 'partial' | 'mock',
  ): QuickVerifyResult {
    const flags: string[] = [];
    let score = 1.0;

    // Check 1: cross-agent consistency — strong sentiment vs risk level
    if (agent1.sentimentScore > 0.5 && agent2.riskLevel === 'HIGH') {
      flags.push('Strong bullish sentiment contradicts HIGH risk level');
      score -= 0.2;
    }
    if (agent1.sentimentScore < -0.5 && agent2.riskLevel === 'LOW') {
      flags.push('Strong bearish sentiment contradicts LOW risk level');
      score -= 0.1;
    }

    // Check 2: pump-and-dump with bullish sentiment is a manipulation signal
    if (agent2.pumpAndDumpSignals && agent1.sentimentScore > 0.3) {
      flags.push('Pump-and-dump signals detected alongside bullish sentiment');
      score -= 0.25;
    }

    // Check 3: grounding — are Agent 3's keySignals present in the original text?
    const contentLower = content.toLowerCase();
    const groundedSignals = agent3.keySignals.filter(s =>
      s.split(' ').some(word => word.length > 3 && contentLower.includes(word.toLowerCase())),
    );
    const hallucinationRisk = agent3.keySignals.length > 0 && groundedSignals.length === 0;
    if (hallucinationRisk) {
      flags.push('Agent 3 key signals not found in original post — possible hallucination');
      score -= 0.3;
    }

    // Check 4: pipeline degradation
    if (pipelineStatus === 'partial') {
      flags.push('Pipeline ran in partial mode — one or more agents used fallback values');
      score -= 0.1;
    }
    if (pipelineStatus === 'mock') {
      flags.push('Pipeline ran in mock mode — output is unreliable');
      score -= 0.4;
    }

    // Check 5: very low confidence after risk adjustment
    if (agent2.adjustedConfidence < 0.2) {
      flags.push('Very low adjusted confidence — treat result with caution');
      score -= 0.1;
    }

    const finalScore = Math.max(0, Math.round(score * 100) / 100);
    return {
      executionVerified: pipelineStatus !== 'mock',
      reasoningScore:    finalScore,
      hallucination:     hallucinationRisk,
      consistencyFlags:  flags,
      confidenceLevel:   finalScore >= 0.8 ? 'high' : finalScore >= 0.5 ? 'medium' : 'low',
    };
  }

  // ─── Final scoring formula (all in code, no LLM) ──────────────────────────

  private computeFinalResult(
    postId:         string,
    agent1:         SentimentAgentResult,
    agent2:         RiskAgentResult,
    agent3:         ExplanationAgentResult,
    pipelineStatus: 'full' | 'partial' | 'mock',
  ): DeepAnalysisResult {
    const sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
      agent1.sentimentScore > 0.15 ? 'BULLISH' :
      agent1.sentimentScore < -0.15 ? 'BEARISH' : 'NEUTRAL';

    const confidenceScore = Math.round(agent2.adjustedConfidence * 100) / 100;
    const riskLevel = agent2.riskLevel;

    const keyThemes = [...new Set([
      ...agent1.matchedKeywords.slice(0, 3),
      ...agent2.riskFlags.slice(0, 2),
    ])].slice(0, 5);

    const effectiveStatus: 'full' | 'partial' | 'mock' =
      pipelineStatus === 'partial' && confidenceScore < 0.25 ? 'mock' : pipelineStatus;

    return {
      postId,
      summary:         agent3.summary,
      sentiment,
      reasoning:       agent3.reasoning,
      keyThemes,
      riskLevel,
      recommendation:  agent3.recommendation,
      analyzedAt:      new Date().toISOString(),
      confidenceScore,
      sentimentScore:  Math.round(agent1.sentimentScore * 100) / 100,
      pipelineStatus:  effectiveStatus,
      agentTrace:      { agent1, agent2, agent3 },
    };
  }
}
