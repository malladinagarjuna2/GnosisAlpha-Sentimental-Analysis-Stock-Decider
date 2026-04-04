// src/modules/analysis/agents/sentiment.agent.ts
// Agent 1: Sentiment + Relevance — uses Gemini Flash
import { Injectable, Logger } from '@nestjs/common';
import { GeminiProvider } from '../llm/gemini.provider';
import {
  SentimentAgentSchema,
  SentimentAgentResult,
  DEFAULT_SENTIMENT_RESULT,
  validateAgentOutput,
} from './agent.interfaces';

const SYSTEM_PROMPT = `You are a financial sentiment classifier for social media posts about stocks and crypto.
Analyze the given post and return ONLY valid JSON with no markdown, no explanation, no extra text.

Required JSON schema:
{
  "asset": "the main asset mentioned (e.g. BTC, ETH, TSLA, AAPL, SOL) or UNKNOWN",
  "relevanceScore": number between 0 and 1 (how relevant to financial markets),
  "tweetType": one of: "news" | "opinion" | "hype" | "fear" | "spam",
  "sentimentScore": number between -1 (very bearish) and 1 (very bullish),
  "matchedKeywords": array of key words/phrases that drove the sentiment,
  "confidence": number between 0 and 1 (how confident in this classification)
}`;

@Injectable()
export class SentimentAgent {
  private readonly logger = new Logger(SentimentAgent.name);

  constructor(private readonly gemini: GeminiProvider) {}

  async analyze(
    postContent: string,
    nlpContext?: { sentimentScore?: number; category?: string } | null,
  ): Promise<SentimentAgentResult> {
    if (!this.gemini.isAvailable()) {
      this.logger.warn('Agent 1 (Gemini): provider unavailable — using defaults');
      return DEFAULT_SENTIMENT_RESULT;
    }

    const contextNote = nlpContext
      ? `\nExisting NLP analysis: score=${nlpContext.sentimentScore?.toFixed(2) ?? 'N/A'}, category=${nlpContext.category ?? 'N/A'}`
      : '';

    const userPrompt = `Post: "${postContent}"${contextNote}

Classify this post now. Return only JSON.`;

    try {
      const raw = await this.gemini.generate(SYSTEM_PROMPT, userPrompt);
      const result = validateAgentOutput(raw, SentimentAgentSchema, 'Agent 1 (Gemini)');
      this.logger.log(
        `Agent 1 ✅ asset=${result.asset} sentiment=${result.sentimentScore.toFixed(2)} confidence=${result.confidence.toFixed(2)}`,
      );
      return result;
    } catch (err) {
      this.logger.warn(`Agent 1 failed: ${(err as Error).message} — using defaults`);
      return DEFAULT_SENTIMENT_RESULT;
    }
  }
}