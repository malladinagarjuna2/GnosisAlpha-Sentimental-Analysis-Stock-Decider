// src/modules/strategies/dto/strategy-config.interface.ts
import { SentimentCategory } from '@prisma/client';

/**
 * Configuration shape for a user-defined analysis strategy.
 * Matches the Step 8 spec shape — thresholds are 0–100 for impact, 0–1 for confidence.
 */
export interface StrategyConfig {
  /** User-defined positive keywords that boost sentiment score */
  keywordsPositive: string[];
  /** User-defined negative keywords that lower sentiment score */
  keywordsNegative: string[];
  /** Minimum impact score (0–100) required to trigger alert */
  impactThreshold: number;
  /** Minimum confidence (0–1) required to trigger alert */
  confidenceThreshold: number;
  /** Weight of sentiment score in composite evaluation (0–1) */
  sentimentWeight: number;
  /** Weight of impact score in composite evaluation (0–1) */
  impactWeight: number;
  /** Minimum composite score magnitude required to fire alert (0–1) */
  sentimentThreshold: number;
  /** Which sentiment categories this strategy watches */
  categories: SentimentCategory[];
}

/** Default strategy config applied when user has no active strategy */
export const DEFAULT_STRATEGY_CONFIG: StrategyConfig = {
  keywordsPositive: [],
  keywordsNegative: [],
  impactThreshold: 70,
  confidenceThreshold: 0.6,
  sentimentWeight: 0.5,
  impactWeight: 0.5,
  sentimentThreshold: 0.2,
  categories: [
    SentimentCategory.SOCIAL_BUZZ,
    SentimentCategory.NEWS,
    SentimentCategory.RUMOR,
    SentimentCategory.WHALE_ACTIVITY,
  ],
};
