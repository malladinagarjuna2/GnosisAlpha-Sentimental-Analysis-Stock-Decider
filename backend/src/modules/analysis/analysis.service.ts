// src/modules/analysis/analysis.service.ts
// STEP 10: On-demand 3-agent multi-LLM deep analysis pipeline.
// Pipeline: Agent1(Gemini) → Agent2(OpenAI) → Agent3(Gemini) → score in CODE
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
import type { ArmorIQVerification } from './armoriq/armoriq.client';

export interface DeepAnalysisResult {
  // ── Core fields (unchanged from original) ────────────────────────────────
  postId:          string;
  summary:         string;
  sentiment:       'BULLISH' | 'BEARISH' | 'NEUTRAL';
  reasoning:       string;
  keyThemes:       string[];
  riskLevel:       'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  recommendation:  string;
  analyzedAt:      string;
  // ── Extended fields (new) ─────────────────────────────────────────────────
  confidenceScore: number;         // 0–1, computed in code
  sentimentScore:  number;         // -1–1, numeric
  pipelineStatus:  'full' | 'partial' | 'mock';
  agentTrace?:     AgentTrace;     // per-agent outputs for frontend transparency
  security?:       ArmorIQVerification;
}

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

  async deepAnalyze(postId: string): Promise<DeepAnalysisResult> {
    // 1. Fetch post — 404 if not found
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException(`Post [${postId}] not found`);

    // 2. Fetch existing NLP result for context enrichment
    const nlpResult = await this.prisma.sentimentResult.findUnique({ where: { postId } });
    this.logger.log(`🔍 Deep analysis started for post [${postId}]`);

    let pipelineStatus: 'full' | 'partial' | 'mock' = 'full';

    // ── ArmorIQ: Capture plan upfront ─────────────────────────────────────
    let intentTokenId: string | null = null;
    if (this.armoriq.isAvailable()) {
      intentTokenId = await this.armoriq.capturePlan([
        { tool: 'sentiment_analysis', description: 'Classify sentiment, relevance, and asset for the post' },
        { tool: 'risk_detection',     description: 'Detect sarcasm, manipulation, and pump-and-dump signals' },
        { tool: 'explanation',        description: 'Generate human-readable summary and recommendation' },
      ]);
    }

    // ── Agent 1: Sentiment + Relevance (Gemini) ───────────────────────────
    let agent1: SentimentAgentResult;
    try {
      agent1 = await this.sentimentAgent.analyze(post.content, nlpResult);
    } catch (err) {
      this.logger.warn(`Agent 1 exception: ${(err as Error).message}`);
      agent1 = DEFAULT_SENTIMENT_RESULT;
      pipelineStatus = 'partial';
    }

    // ── Agent 2: Risk / Sarcasm (OpenAI) ─────────────────────────────────
    let agent2: RiskAgentResult;
    try {
      agent2 = await this.riskAgent.analyze(post.content, agent1);
    } catch (err) {
      this.logger.warn(`Agent 2 exception: ${(err as Error).message}`);
      agent2 = DEFAULT_RISK_RESULT(agent1.confidence);
      pipelineStatus = 'partial';
    }

    // ── Agent 3: Explanation (Gemini) ─────────────────────────────────────
    let agent3: ExplanationAgentResult;
    try {
      agent3 = await this.explanationAgent.analyze(post.content, agent1, agent2);
    } catch (err) {
      this.logger.warn(`Agent 3 exception: ${(err as Error).message}`);
      agent3 = {
        summary:        `${agent1.asset} post with ${agent1.sentimentScore > 0 ? 'bullish' : 'bearish'} signals.`,
        reasoning:      agent2.riskFlags.join('. ') || 'No risk flags detected.',
        keySignals:     [...agent1.matchedKeywords.slice(0, 2), ...agent2.riskFlags.slice(0, 2)],
        recommendation: 'Monitor for confirmation before acting.',
      };
      pipelineStatus = 'partial';
    }

    // ── Final scoring in CODE (not LLM) ──────────────────────────────────
    const result = this.computeFinalResult(postId, agent1, agent2, agent3, pipelineStatus);

    // ── ArmorIQ: Build verification block ────────────────────────────────
    if (intentTokenId) {
      result.security = this.armoriq.buildVerification(intentTokenId, true);
    } else {
      result.security = this.armoriq.buildBypassVerification(!this.armoriq.isAvailable());
    }

    this.logger.log(
      `✅ Deep analysis complete [${postId}] — ` +
      `sentiment=${result.sentiment} confidence=${result.confidenceScore.toFixed(2)} ` +
      `pipeline=${result.pipelineStatus} armoriq=${result.security?.verified ?? false}`,
    );

    return result;
  }

  async deepAnalyzeText(text: string, asset: string): Promise<DeepAnalysisResult> {
    const fakePostId = `text-${Date.now()}`;
    this.logger.log(`🔍 Deep analysis started for text [${asset}]`);

    let pipelineStatus: 'full' | 'partial' | 'mock' = 'full';

    let intentTokenId: string | null = null;
    if (this.armoriq.isAvailable()) {
      intentTokenId = await this.armoriq.capturePlan([
        { tool: 'sentiment_analysis', description: 'Classify sentiment, relevance, and asset for the text' },
        { tool: 'risk_detection',     description: 'Detect sarcasm, manipulation, and pump-and-dump signals' },
        { tool: 'explanation',        description: 'Generate human-readable summary and recommendation' },
      ]);
    }

    let agent1: SentimentAgentResult;
    try {
      agent1 = await this.sentimentAgent.analyze(text, null);
    } catch (err) {
      this.logger.warn(`Agent 1 exception: ${(err as Error).message}`);
      agent1 = DEFAULT_SENTIMENT_RESULT;
      pipelineStatus = 'partial';
    }

    let agent2: RiskAgentResult;
    try {
      agent2 = await this.riskAgent.analyze(text, agent1);
    } catch (err) {
      this.logger.warn(`Agent 2 exception: ${(err as Error).message}`);
      agent2 = DEFAULT_RISK_RESULT(agent1.confidence);
      pipelineStatus = 'partial';
    }

    let agent3: ExplanationAgentResult;
    try {
      agent3 = await this.explanationAgent.analyze(text, agent1, agent2);
    } catch (err) {
      this.logger.warn(`Agent 3 exception: ${(err as Error).message}`);
      agent3 = {
        summary:        `${asset} post with ${agent1.sentimentScore > 0 ? 'bullish' : 'bearish'} signals.`,
        reasoning:      agent2.riskFlags.join('. ') || 'No risk flags detected.',
        keySignals:     [...agent1.matchedKeywords.slice(0, 2), ...agent2.riskFlags.slice(0, 2)],
        recommendation: 'Monitor for confirmation before acting.',
      };
      pipelineStatus = 'partial';
    }

    const result = this.computeFinalResult(fakePostId, agent1, agent2, agent3, pipelineStatus);

    if (intentTokenId) {
      result.security = this.armoriq.buildVerification(intentTokenId, true);
    } else {
      result.security = this.armoriq.buildBypassVerification(!this.armoriq.isAvailable());
    }

    this.logger.log(`✅ Deep analysis complete [text/${asset}] — sentiment=${result.sentiment} pipeline=${result.pipelineStatus}`);
    return result;
  }

  // ─── Final scoring formula — all in code, no LLM ─────────────────────────

  private computeFinalResult(
    postId:         string,
    agent1:         SentimentAgentResult,
    agent2:         RiskAgentResult,
    agent3:         ExplanationAgentResult,
    pipelineStatus: 'full' | 'partial' | 'mock',
  ): DeepAnalysisResult {
    // Sentiment label from Agent 1's numeric score
    const sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
      agent1.sentimentScore > 0.15 ? 'BULLISH' :
      agent1.sentimentScore < -0.15 ? 'BEARISH' : 'NEUTRAL';

    // Final confidence from Agent 2's adjusted value (already penalised for risk)
    const confidenceScore = Math.round(agent2.adjustedConfidence * 100) / 100;

    // Risk level from Agent 2
    const riskLevel = agent2.riskLevel;

    // Key themes: top Agent 1 keywords + Agent 2 risk flags (deduped, max 5)
    const keyThemes = [...new Set([
      ...agent1.matchedKeywords.slice(0, 3),
      ...agent2.riskFlags.slice(0, 2),
    ])].slice(0, 5);

    // Mark as mock if both agents used defaults (very low confidence)
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
      agentTrace: { agent1, agent2, agent3 },
    };
  }
}
