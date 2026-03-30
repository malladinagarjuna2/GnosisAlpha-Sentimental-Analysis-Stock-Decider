// src/modules/sentiment/sentiment.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SentimentCategory, AnalysisMethod } from '@prisma/client';

export interface SentimentInput {
  postId: string;
  text: string;
  authorFollowers?: number;
  retweetCount?: number;
  likeCount?: number;
  /** User-defined custom positive keywords from strategy config */
  customKeywordsPositive?: string[];
  /** User-defined custom negative keywords from strategy config */
  customKeywordsNegative?: string[];
}

export interface SentimentOutput {
  sentimentScore: number;   // -1 to 1
  impactScore: number;      // 0 to 100
  confidence: number;       // 0 to 1
  category: SentimentCategory;
  reason?: string;
  isWhaleAlert?: boolean;
}

// ─── Keyword dictionaries ────────────────────────────────────────────────────

const POSITIVE_KEYWORDS: Record<string, number> = {
  'bullish': 0.3, 'moon': 0.25, 'pump': 0.2, 'rally': 0.25,
  'breakout': 0.25, 'buy': 0.15, 'long': 0.15, 'accumulation': 0.2,
  'strong': 0.15, 'growth': 0.15, 'surge': 0.25, 'soar': 0.25,
  'all-time high': 0.3, 'ath': 0.3, 'uptrend': 0.2, 'recovery': 0.15,
  'outperform': 0.2, 'partnership': 0.15, 'adoption': 0.15,
  'record': 0.2, 'milestone': 0.15, 'profitable': 0.2, 'beat': 0.15,
  'exceeding': 0.15, 'best-selling': 0.15, 'incredible': 0.2,
  '🚀': 0.2, '🔥': 0.15, '💎': 0.15, '📈': 0.2,
};

const NEGATIVE_KEYWORDS: Record<string, number> = {
  'bearish': -0.3, 'dump': -0.25, 'crash': -0.3, 'sell': -0.15,
  'short': -0.15, 'decline': -0.2, 'drop': -0.2, 'plunge': -0.25,
  'liquidation': -0.25, 'rug pull': -0.3, 'scam': -0.3, 'hack': -0.25,
  'fear': -0.2, 'panic': -0.25, 'bubble': -0.2, 'downtrend': -0.2,
  'loss': -0.15, 'miss': -0.15, 'losing': -0.15, 'headwinds': -0.15,
  'warning': -0.15, 'careful': -0.1, 'risk': -0.1, 'bearish divergence': -0.25,
  'selling pressure': -0.2, 'down': -0.1, 'reducing': -0.1, 'trimming': -0.1,
  '📉': -0.2, '😱': -0.15,
};

const NEWS_KEYWORDS = ['earnings', 'report', 'sec', 'regulation', 'federal', 'announcement', 'released', 'quarterly'];
const RUMOR_KEYWORDS = ['rumor', 'rumored', 'leak', 'leaked', 'unconfirmed', 'speculation', 'allegedly', 'sources say'];
const WHALE_KEYWORDS = ['whale', 'massive buy', 'billion', 'million', 'institutional', 'insider', '🐋'];

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class SentimentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fast keyword-based sentiment analysis — runs automatically for every post.
   * Produces: sentiment_score, impact_score, confidence, category, reason.
   */
  async analyzeWithNlp(input: SentimentInput): Promise<SentimentOutput> {
    const text = input.text.toLowerCase();
    const reasons: string[] = [];

    // 1. Keyword-based sentiment score (-1 to 1)
    let rawScore = 0;
    let matchCount = 0;

    for (const [keyword, weight] of Object.entries(POSITIVE_KEYWORDS)) {
      if (text.includes(keyword)) {
        rawScore += weight;
        matchCount++;
        reasons.push(`+${keyword}`);
      }
    }
    for (const [keyword, weight] of Object.entries(NEGATIVE_KEYWORDS)) {
      if (text.includes(keyword)) {
        rawScore += weight; // weight is already negative
        matchCount++;
        reasons.push(keyword);
      }
    }

    // Custom user keywords from strategy config (weight: ±0.2 each)
    for (const keyword of (input.customKeywordsPositive ?? [])) {
      if (text.includes(keyword.toLowerCase())) {
        rawScore += 0.2;
        matchCount++;
        reasons.push(`+${keyword}(custom)`);
      }
    }
    for (const keyword of (input.customKeywordsNegative ?? [])) {
      if (text.includes(keyword.toLowerCase())) {
        rawScore -= 0.2;
        matchCount++;
        reasons.push(`${keyword}(custom)`);
      }
    }

    // Clamp to [-1, 1]
    const sentimentScore = Math.max(-1, Math.min(1, rawScore));

    // 2. Confidence (0 to 1) — based on number of keyword matches
    const confidence = Math.min(0.3 + matchCount * 0.15, 0.95);

    // 3. Impact score (0 to 100) — based on engagement metrics
    const impactScore = this.computeImpactScore(
      sentimentScore,
      input.authorFollowers ?? 0,
      input.retweetCount ?? 0,
      input.likeCount ?? 0,
    );

    // 4. Category detection
    const category = this.detectCategory(text);

    // 5. Build reason string
    const reason = matchCount > 0
      ? `Matched ${matchCount} keyword(s): ${reasons.slice(0, 5).join(', ')}${matchCount > 5 ? '...' : ''}`
      : 'No keyword matches — neutral';

    return { sentimentScore, impactScore, confidence, category, reason };
  }

  /**
   * Compute impact score (0–100) from sentiment strength + engagement.
   */
  private computeImpactScore(
    sentimentScore: number,
    followers: number,
    retweets: number,
    likes: number,
  ): number {
    // Sentiment strength: 0 to 40 points
    const sentimentComponent = Math.abs(sentimentScore) * 40;

    // Engagement factor: 0 to 60 points
    const followerScore = Math.min(followers / 500_000, 1) * 20;  // max 20
    const retweetScore = Math.min(retweets / 1_000, 1) * 25;      // max 25
    const likeScore = Math.min(likes / 5_000, 1) * 15;            // max 15

    const total = sentimentComponent + followerScore + retweetScore + likeScore;
    return Math.round(Math.max(0, Math.min(100, total)));
  }

  /**
   * Detect category based on keyword presence in the text.
   */
  private detectCategory(text: string): SentimentCategory {
    if (WHALE_KEYWORDS.some(k => text.includes(k))) return SentimentCategory.WHALE_ACTIVITY;
    if (RUMOR_KEYWORDS.some(k => text.includes(k))) return SentimentCategory.RUMOR;
    if (NEWS_KEYWORDS.some(k => text.includes(k))) return SentimentCategory.NEWS;
    return SentimentCategory.SOCIAL_BUZZ;
  }

  /**
   * LLM-based deep analysis — ONLY called on-demand when user clicks a post.
   * NOT invoked automatically.
   */
  async analyzeWithLlm(_input: SentimentInput): Promise<SentimentOutput> {
    // TODO: integrate OpenAI / Gemini call here
    throw new Error('LLM analysis not yet implemented');
  }

  async saveResult(postId: string, output: SentimentOutput, method: AnalysisMethod = AnalysisMethod.NLP) {
    return this.prisma.sentimentResult.upsert({
      where: { postId },
      create: { postId, ...output, analyzedBy: method },
      update: { ...output, analyzedBy: method },
    });
  }

  async getForPost(postId: string) {
    return this.prisma.sentimentResult.findUnique({ where: { postId } });
  }
}
