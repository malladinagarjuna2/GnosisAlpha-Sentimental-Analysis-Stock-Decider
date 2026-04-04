// src/modules/analysis/agents/explanation.agent.ts
// Agent 3: Human-Friendly Explanation — uses Gemini Flash
import { Injectable, Logger } from '@nestjs/common';
import { GeminiProvider } from '../llm/gemini.provider';
import {
  ExplanationAgentSchema,
  ExplanationAgentResult,
  SentimentAgentResult,
  RiskAgentResult,
  validateAgentOutput,
} from './agent.interfaces';

const SYSTEM_PROMPT = `You are a financial analyst writing clear, concise explanations for retail investors.
Given sentiment analysis and risk assessment data about a social media post, produce a human-readable summary.
Return ONLY valid JSON with no markdown, no explanation, no extra text.

Required JSON schema:
{
  "summary": "1-2 sentence overview of the post's likely market impact",
  "reasoning": "why the score is bullish/bearish/neutral — reference specific signals",
  "keySignals": array of 2-4 strings (the most important signals found),
  "recommendation": "brief trader-friendly action note (e.g. 'Monitor for confirmation', 'High-risk signal, verify independently')"
}`;

@Injectable()
export class ExplanationAgent {
  private readonly logger = new Logger(ExplanationAgent.name);

  constructor(private readonly gemini: GeminiProvider) {}

  async analyze(
    postContent: string,
    agent1: SentimentAgentResult,
    agent2: RiskAgentResult,
  ): Promise<ExplanationAgentResult> {
    if (!this.gemini.isAvailable()) {
      this.logger.warn('Agent 3 (Gemini): provider unavailable — using template');
      return this.templateFallback(agent1, agent2);
    }

    const userPrompt = `Post: "${postContent}"

Sentiment analysis:
- Asset: ${agent1.asset}
- Sentiment score: ${agent1.sentimentScore.toFixed(2)} (${agent1.sentimentScore > 0.15 ? 'BULLISH' : agent1.sentimentScore < -0.15 ? 'BEARISH' : 'NEUTRAL'})
- Tweet type: ${agent1.tweetType}
- Keywords matched: ${agent1.matchedKeywords.join(', ') || 'none'}
- Relevance: ${(agent1.relevanceScore * 100).toFixed(0)}%

Risk assessment:
- Risk level: ${agent2.riskLevel}
- Sarcasm detected: ${agent2.sarcasmDetected}
- Pump-and-dump signals: ${agent2.pumpAndDumpSignals}
- Risk flags: ${agent2.riskFlags.join(', ') || 'none'}
- Final confidence: ${(agent2.adjustedConfidence * 100).toFixed(0)}%

Generate the explanation now. Return only JSON.`;

    try {
      const raw = await this.gemini.generate(SYSTEM_PROMPT, userPrompt);
      const result = validateAgentOutput(raw, ExplanationAgentSchema, 'Agent 3 (Gemini)');
      this.logger.log(`Agent 3 ✅ summary="${result.summary.slice(0, 60)}..."`);
      return result;
    } catch (err) {
      this.logger.warn(`Agent 3 failed: ${(err as Error).message} — using template`);
      return this.templateFallback(agent1, agent2);
    }
  }

  private templateFallback(agent1: SentimentAgentResult, agent2: RiskAgentResult): ExplanationAgentResult {
    const direction = agent1.sentimentScore > 0.15 ? 'bullish' : agent1.sentimentScore < -0.15 ? 'bearish' : 'neutral';
    return {
      summary: `${agent1.asset} post shows ${direction} signals with ${agent2.riskLevel} risk level.`,
      reasoning: `Sentiment score of ${agent1.sentimentScore.toFixed(2)} based on keywords: ${agent1.matchedKeywords.join(', ') || 'none'}. ${agent2.riskFlags.join('. ') || 'No risk flags detected.'}`,
      keySignals: [...agent1.matchedKeywords.slice(0, 2), ...agent2.riskFlags.slice(0, 2)],
      recommendation: agent2.riskLevel === 'HIGH'
        ? 'High risk detected — verify independently before acting.'
        : agent2.riskLevel === 'UNKNOWN'
          ? 'Risk analysis unavailable — treat with caution.'
          : 'Monitor for confirmation before trading.',
    };
  }
}
