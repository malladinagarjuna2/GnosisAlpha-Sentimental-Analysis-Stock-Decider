// src/modules/agents/adapters/nlp-sentiment.agent.ts
// Wraps the existing SentimentService as an AgentPort.
// This is the ONLY agent active right now. Multi-agent + trading algo
// will be added later — they just implement the same AgentPort interface.
import { Injectable, Logger } from '@nestjs/common';
import { SentimentService } from '../../sentiment/sentiment.service';
import type { AgentPort, AgentContext, AgentSignal, AgentType } from '../ports/agent.port';

// Asset keyword map for matching tweets to assets
const ASSET_KEYWORDS: Record<string, string[]> = {
  RELIANCE:   ['reliance', 'ril', '$reliance', 'jio', 'mukesh ambani'],
  TCS:        ['tcs', 'tata consultancy', '$tcs'],
  INFY:       ['infosys', 'infy', '$infy', 'narayana murthy'],
  HDFCBANK:   ['hdfc bank', 'hdfcbank', '$hdfcbank', 'hdfc'],
  ICICIBANK:  ['icici bank', 'icicibank', '$icicibank', 'icici'],
  SBIN:       ['sbi', 'sbin', '$sbin', 'state bank'],
  WIPRO:      ['wipro', '$wipro'],
  TATAMOTORS: ['tata motors', 'tatamotors', '$tatamotors', 'tata ev', 'jlr', 'nexon'],
  BAJFINANCE: ['bajaj finance', 'bajfinance', '$bajfinance'],
  LT:         ['larsen', 'l&t', '$lt', 'larsen toubro'],
};

@Injectable()
export class NlpSentimentAgent implements AgentPort {
  private readonly logger = new Logger(NlpSentimentAgent.name);

  readonly name = 'NLP Sentiment Agent';
  readonly type: AgentType = 'SENTIMENT';
  readonly version = '1.0.0';

  constructor(private readonly sentimentService: SentimentService) {}

  async analyze(context: AgentContext): Promise<AgentSignal[]> {
    const signals: AgentSignal[] = [];
    const requestedAssets = new Set(context.assets.map(a => a.toUpperCase()));

    for (const post of context.posts) {
      // Match tweet to an asset
      const matchedAsset = this.matchToAsset(post.content, requestedAssets);
      if (!matchedAsset) continue;

      // Run NLP sentiment
      const result = await this.sentimentService.analyzeWithNlp({
        postId: `agent-nlp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: post.content,
        authorFollowers: post.authorFollowers,
        retweetCount: post.retweetCount,
        likeCount: post.likeCount,
      });

      // Weight score by trust
      const weightedScore = result.sentimentScore * post.trustScore;

      signals.push({
        agentName: this.name,
        agentType: this.type,
        asset: matchedAsset,
        action: weightedScore > 0.15 ? 'BUY' : weightedScore < -0.15 ? 'SELL' : 'HOLD',
        confidence: result.confidence,
        score: weightedScore,
        reasoning: result.reason ?? `NLP score: ${weightedScore.toFixed(3)}`,
        timestamp: post.postedAt,
        metadata: {
          impactScore: result.impactScore,
          category: result.category,
          source: post.source,
          trustScore: post.trustScore,
          trigger: post.content.slice(0, 120),
        },
      });
    }

    this.logger.log(`🧠 NLP Agent produced ${signals.length} signals from ${context.posts.length} posts`);
    return signals;
  }

  async isHealthy(): Promise<boolean> {
    return true; // NLP is always available (keyword-based, no external deps)
  }

  private matchToAsset(content: string, requested: Set<string>): string | null {
    const lower = content.toLowerCase();
    for (const asset of requested) {
      const keywords = ASSET_KEYWORDS[asset];
      if (keywords?.some(kw => lower.includes(kw))) return asset;
    }
    return null;
  }
}
