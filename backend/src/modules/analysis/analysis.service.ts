// src/modules/analysis/analysis.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AgentOrchestratorService } from '../agents/agent-orchestrator.service';
import { SentimentAgent } from './agents/sentiment.agent';
import { RiskAgent } from './agents/risk.agent';
import { ExplanationAgent } from './agents/explanation.agent';
import { ArmorIQClient, AgentAuditEntry, PolicyDecision, ArmorIQVerification } from './armoriq/armoriq.client';
import type { SentimentAgentResult, RiskAgentResult, ExplanationAgentResult } from './agents/agent.interfaces';
import OpenAI from 'openai';

// ─── Deep Analysis (single OpenAI call) ──────────────────────────────────────

export interface DeepAnalysisResult {
  postId: string;
  summary: string;
  sentiment: string;
  reasoning: string;
  keyThemes: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: string;
  analyzedAt: string;
}

// ─── Multi-Agent Pipeline Result (3-agent + ArmorIQ) ─────────────────────────

export interface MultiAgentPipelineResult {
  postId: string;
  summary: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  reasoning: string;
  keyThemes: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  recommendation: string;
  analyzedAt: string;
  confidenceScore: number;
  sentimentScore: number;
  pipelineStatus: 'full' | 'partial' | 'mock';
  agentTrace: {
    agent1: SentimentAgentResult;
    agent2: RiskAgentResult;
    agent3: ExplanationAgentResult;
  };
  security: ArmorIQVerification;
}

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private readonly openai: OpenAI | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly orchestrator: AgentOrchestratorService,
    private readonly sentimentAgent: SentimentAgent,
    private readonly riskAgent: RiskAgent,
    private readonly explanationAgent: ExplanationAgent,
    private readonly armoriq: ArmorIQClient,
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (apiKey && apiKey !== 'your_openai_api_key') {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('🤖 OpenAI client initialized');
    } else {
      this.openai = null;
      this.logger.warn('⚠️  OpenAI API key not configured — LLM analysis will return mock results');
    }
  }

  // ─── Deep Analysis (single GPT-4o-mini call) ─────────────────────────────

  async deepAnalyze(postId: string): Promise<DeepAnalysisResult> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException(`Post [${postId}] not found`);

    const nlpResult = await this.prisma.sentimentResult.findUnique({ where: { postId } });

    this.logger.log(`🔍 Deep analysis requested for post [${postId}]`);

    if (!this.openai) {
      return this.mockAnalysis(postId, post.content);
    }

    const prompt = this.buildPrompt(post.content, nlpResult);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a financial sentiment analyst. Analyze social media posts about stocks and crypto. ' +
            'Respond ONLY with valid JSON matching the requested schema.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 600,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    this.logger.log(`✅ LLM analysis complete for post [${postId}]`);

    return this.parseResponse(postId, raw);
  }

  // ─── Multi-Agent Analysis (3-agent pipeline + ArmorIQ) ───────────────────

  async multiAgentAnalyze(postId: string): Promise<MultiAgentPipelineResult> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { asset: true, sentiment: true },
    });
    if (!post) throw new NotFoundException(`Post [${postId}] not found`);

    this.logger.log(`🤖 Multi-agent pipeline started for post [${postId}]`);

    const content = post.content;
    const nlpContext = post.sentiment
      ? { sentimentScore: post.sentiment.sentimentScore, category: post.sentiment.category }
      : null;

    const policyDecisions: PolicyDecision[] = [];
    const agentAuditEntries: AgentAuditEntry[] = [];
    const agentTokenIds: Record<string, string> = {};
    let masterTokenId: string | null = null;
    let masterPlanId: string | null = null;
    let pipelineStatus: 'full' | 'partial' | 'mock' = 'full';

    // ── Agent 1: Sentiment (Gemini) ──────────────────────────────────────────
    const a1Start = new Date().toISOString();
    const { tokenId: t1, planId: p1 } = await this.armoriq.captureAgentPlan(
      'SentimentAgent', 'gemini_sentiment', 'Classify post sentiment and asset relevance',
      { allowedTools: ['gemini_sentiment'] }, 30,
    );
    if (t1) { agentTokenIds['SentimentAgent'] = t1; masterTokenId = t1; masterPlanId = p1; }

    const gate1 = this.armoriq.evaluatePolicyGate('SentimentAgent', true, 'Token valid, proceeding');
    policyDecisions.push(gate1);

    const agent1: SentimentAgentResult = await this.sentimentAgent.analyze(content, nlpContext);

    agentAuditEntries.push({
      agentName: 'SentimentAgent',
      tokenId: t1,
      tokenValid: true,
      startedAt: a1Start,
      completedAt: new Date().toISOString(),
      outcome: 'success',
    });

    // ── Agent 2: Risk (OpenAI) ───────────────────────────────────────────────
    const a2Start = new Date().toISOString();
    const { tokenId: t2 } = await this.armoriq.captureAgentPlan(
      'RiskAgent', 'openai_risk', 'Detect pump-and-dump, sarcasm, manipulation signals',
      { allowedTools: ['openai_risk'], minRelevanceScore: 0.3 }, 30,
    );
    if (t2) agentTokenIds['RiskAgent'] = t2;

    const relevanceOk = agent1.relevanceScore >= 0.3;
    const gate2 = this.armoriq.evaluatePolicyGate(
      'RiskAgent',
      relevanceOk,
      relevanceOk ? 'Relevance score sufficient for risk analysis' : 'Relevance too low — skipping risk analysis',
    );
    policyDecisions.push(gate2);

    const agent2: RiskAgentResult = await this.riskAgent.analyze(content, agent1);

    agentAuditEntries.push({
      agentName: 'RiskAgent',
      tokenId: t2,
      tokenValid: true,
      startedAt: a2Start,
      completedAt: new Date().toISOString(),
      outcome: 'success',
    });

    // ── Agent 3: Explanation (Gemini) — policy gated ─────────────────────────
    const a3Start = new Date().toISOString();
    const { tokenId: t3 } = await this.armoriq.captureAgentPlan(
      'ExplanationAgent', 'gemini_explain', 'Generate human-friendly explanation',
      { allowedTools: ['gemini_explain'], blockOnHighRisk: true }, 30,
    );
    if (t3) agentTokenIds['ExplanationAgent'] = t3;

    const isHighRiskPump = agent2.riskLevel === 'HIGH' && agent2.pumpAndDumpSignals;
    const gate3 = this.armoriq.evaluatePolicyGate(
      'ExplanationAgent',
      !isHighRiskPump,
      isHighRiskPump
        ? `Risk gate: riskLevel=HIGH pumpAndDump=true`
        : 'Risk level acceptable — explanation permitted',
    );
    policyDecisions.push(gate3);

    let agent3: ExplanationAgentResult;
    let agent3Blocked = false;

    if (isHighRiskPump) {
      // Blocked — return warning instead of explanation
      agent3Blocked = true;
      agent3 = {
        summary: 'Analysis blocked: content flagged as HIGH risk.',
        reasoning: `ArmorIQ policy gate prevented explanation. Risk gate: riskLevel=HIGH pumpAndDump=true`,
        keySignals: agent2.riskFlags,
        recommendation: 'Do not act on this signal. Independent verification required.',
      };
      agentAuditEntries.push({
        agentName: 'ExplanationAgent',
        tokenId: t3,
        tokenValid: true,
        startedAt: a3Start,
        completedAt: new Date().toISOString(),
        outcome: 'blocked',
      });
      pipelineStatus = 'partial';
    } else {
      agent3 = await this.explanationAgent.analyze(content, agent1, agent2);
      agentAuditEntries.push({
        agentName: 'ExplanationAgent',
        tokenId: t3,
        tokenValid: true,
        startedAt: a3Start,
        completedAt: new Date().toISOString(),
        outcome: 'success',
      });
    }

    // ── quickVerify — consistency check ──────────────────────────────────────
    const quickVerify = this.runQuickVerify(content, agent1, agent2, agent3, agent3Blocked);

    // ── Finalize ArmorIQ plan ─────────────────────────────────────────────────
    if (masterPlanId) {
      await this.armoriq.finalizePlan(
        masterPlanId,
        quickVerify.reasoningScore >= 0.7 && !quickVerify.hallucination ? 'completed' : 'failed',
      );
    }

    // ── Build security block ──────────────────────────────────────────────────
    const security = this.armoriq.isAvailable()
      ? this.armoriq.buildEnhancedVerification({
          masterTokenId,
          masterPlanId,
          agentAuditEntries,
          policyDecisions,
          agentTokenIds,
          pipelineStatus,
          quickVerify,
        })
      : this.armoriq.buildBypassVerification(false);

    // ── Derive top-level fields from agent outputs ────────────────────────────
    const sentimentLabel: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
      agent1.sentimentScore > 0.15 ? 'BULLISH' :
      agent1.sentimentScore < -0.15 ? 'BEARISH' : 'NEUTRAL';

    return {
      postId,
      summary: agent3.summary,
      sentiment: sentimentLabel,
      reasoning: agent3.reasoning,
      keyThemes: agent3.keySignals,
      riskLevel: agent2.riskLevel,
      recommendation: agent3.recommendation,
      analyzedAt: new Date().toISOString(),
      confidenceScore: agent2.adjustedConfidence,
      sentimentScore: agent1.sentimentScore,
      pipelineStatus,
      agentTrace: { agent1, agent2, agent3 },
      security,
    };
  }

  // ─── quickVerify: consistency checker ────────────────────────────────────

  private runQuickVerify(
    content: string,
    agent1: SentimentAgentResult,
    agent2: RiskAgentResult,
    agent3: ExplanationAgentResult,
    agent3Blocked: boolean,
  ) {
    const flags: string[] = [];
    let score = 1.0;

    // Flag 1: bullish sentiment + HIGH risk
    if (agent1.sentimentScore > 0.5 && agent2.riskLevel === 'HIGH') {
      flags.push('Strong bullish sentiment contradicts HIGH risk level');
      score -= 0.25;
    }

    // Flag 2: pump-and-dump + bullish
    if (agent2.pumpAndDumpSignals && agent1.sentimentScore > 0.3) {
      flags.push('Pump-and-dump signals detected alongside bullish sentiment');
      score -= 0.25;
    }

    // Flag 3: Agent 3 key signals not grounded in original post
    let hallucination = false;
    if (!agent3Blocked && agent3.keySignals.length > 0) {
      const lowerContent = content.toLowerCase();
      const ungrounded = agent3.keySignals.filter(
        sig => !lowerContent.includes(sig.toLowerCase().split(' ')[0]),
      );
      if (ungrounded.length > agent3.keySignals.length / 2) {
        flags.push('Agent 3 key signals not found in original post — possible hallucination');
        hallucination = true;
        score -= 0.5;
      }
    }

    // Flag 4: sarcasm not caught by sentiment
    if (agent2.sarcasmDetected && agent1.sentimentScore > 0.3) {
      flags.push('Sarcasm detected but sentiment score is positive');
      score -= 0.15;
    }

    score = Math.max(0, Math.round(score * 100) / 100);

    return {
      executionVerified: true,
      reasoningScore: score,
      hallucination,
      consistencyFlags: flags,
      confidenceLevel: (score >= 0.7 ? 'high' : score >= 0.4 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
    };
  }

  // ─── Deep analysis helpers ────────────────────────────────────────────────

  private buildPrompt(content: string, nlpResult: any): string {
    const nlpContext = nlpResult
      ? `\nExisting NLP analysis: score=${nlpResult.sentimentScore?.toFixed(2)}, ` +
        `impact=${nlpResult.impactScore}, category=${nlpResult.category}`
      : '';

    return (
      `Analyze this financial social media post:${nlpContext}\n\n` +
      `Post: "${content}"\n\n` +
      `Respond with JSON:\n` +
      `{\n` +
      `  "summary": "1-2 sentence summary",\n` +
      `  "sentiment": "BULLISH|BEARISH|NEUTRAL",\n` +
      `  "reasoning": "why this sentiment",\n` +
      `  "keyThemes": ["theme1", "theme2"],\n` +
      `  "riskLevel": "LOW|MEDIUM|HIGH",\n` +
      `  "recommendation": "brief action recommendation"\n` +
      `}`
    );
  }

  private parseResponse(postId: string, raw: string): DeepAnalysisResult {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      return {
        postId,
        summary: parsed.summary ?? 'Unable to parse summary',
        sentiment: parsed.sentiment ?? 'NEUTRAL',
        reasoning: parsed.reasoning ?? '',
        keyThemes: parsed.keyThemes ?? [],
        riskLevel: parsed.riskLevel ?? 'MEDIUM',
        recommendation: parsed.recommendation ?? '',
        analyzedAt: new Date().toISOString(),
      };
    } catch {
      this.logger.warn(`Failed to parse LLM response for post [${postId}]`);
      return this.mockAnalysis(postId, raw);
    }
  }

  private mockAnalysis(postId: string, content: string): DeepAnalysisResult {
    const lower = content.toLowerCase();
    const bullishWords = ['bullish', 'moon', 'pump', 'rally', 'buy', 'up', 'rise'];
    const bearishWords = ['bearish', 'dump', 'crash', 'sell', 'down', 'fall', 'drop'];
    const bullCount = bullishWords.filter(w => lower.includes(w)).length;
    const bearCount = bearishWords.filter(w => lower.includes(w)).length;
    const sentiment = bullCount > bearCount ? 'BULLISH' : bearCount > bullCount ? 'BEARISH' : 'NEUTRAL';

    return {
      postId,
      summary: `Market post detected with ${sentiment.toLowerCase()} signals. OpenAI not configured — using mock analysis.`,
      sentiment,
      reasoning: 'Mock analysis based on keyword presence. Configure OPENAI_API_KEY for real LLM analysis.',
      keyThemes: ['market sentiment', 'social signal'],
      riskLevel: 'MEDIUM',
      recommendation: 'Configure OPENAI_API_KEY in .env for detailed LLM-powered analysis.',
      analyzedAt: new Date().toISOString(),
    };
  }
}
