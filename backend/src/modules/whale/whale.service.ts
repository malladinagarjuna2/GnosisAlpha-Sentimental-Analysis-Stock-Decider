// src/modules/whale/whale.service.ts
import { Injectable, Logger } from '@nestjs/common';
import type { WhaleCheckDto } from './dto/whale-check.dto';

export interface WhaleCheckResult {
  isWhale: boolean;
  reason?: string;
  /** How much to boost confidence score (0–0.3) */
  confidenceBoost: number;
}

/** Configurable detection thresholds */
const THRESHOLDS = {
  followers: 100_000,
  retweets: 500,
  likes: 2_000,
  keywords: [
    'whale', 'massive buy', 'dump', 'pump', '🐋',
    'insider', 'liquidation', 'billion', 'million',
  ],
} as const;

@Injectable()
export class WhaleService {
  private readonly logger = new Logger(WhaleService.name);

  /**
   * Threshold-based whale activity detection.
   * Checks follower count, engagement metrics, and keyword signals.
   */
  detect(input: WhaleCheckDto): WhaleCheckResult {
    const reasons: string[] = [];
    let confidenceBoost = 0;

    if (input.authorFollowers && input.authorFollowers >= THRESHOLDS.followers) {
      reasons.push(`High-influence author (${input.authorFollowers.toLocaleString()} followers)`);
      confidenceBoost += 0.1;
    }

    if (input.retweetCount && input.retweetCount >= THRESHOLDS.retweets) {
      reasons.push(`High retweet count (${input.retweetCount})`);
      confidenceBoost += 0.1;
    }

    if (input.likeCount && input.likeCount >= THRESHOLDS.likes) {
      reasons.push(`High like count (${input.likeCount})`);
      confidenceBoost += 0.05;
    }

    const lowerContent = input.content.toLowerCase();
    const matchedKeywords = THRESHOLDS.keywords.filter(k => lowerContent.includes(k));
    if (matchedKeywords.length > 0) {
      reasons.push(`Whale keywords: ${matchedKeywords.join(', ')}`);
      confidenceBoost += 0.1 * matchedKeywords.length;
    }

    const isWhale = reasons.length > 0;
    if (isWhale) {
      this.logger.warn(`🐋 Whale signal detected: ${reasons.join(' | ')}`);
    }

    return {
      isWhale,
      reason: reasons.length > 0 ? reasons.join('; ') : undefined,
      confidenceBoost: Math.min(confidenceBoost, 0.3),
    };
  }
}
