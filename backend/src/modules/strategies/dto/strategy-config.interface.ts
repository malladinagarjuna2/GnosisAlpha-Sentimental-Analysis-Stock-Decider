// src/modules/strategies/dto/strategy-config.interface.ts
import { SentimentCategory } from '@prisma/client';

/**
 * Configuration shape for a user-defined analysis strategy.
 * Weights are 0–1; thresholds are in the same range as their target scores.
 */
export interface StrategyConfig {
  /** Weight of sentiment score in composite evaluation (0–1) */
  sentimentWeight: number;
  /** Weight of impact score in composite evaluation (0–1) */
  impactWeight: number;
  /** Minimum confidence required to trigger an alert (0–1) */
  confidenceThreshold: number;
  /** Minimum composite score magnitude required to fire alert (-1–1) */
  sentimentThreshold: number;
  /** Which sentiment categories this strategy watches */
  categories: SentimentCategory[];
}
