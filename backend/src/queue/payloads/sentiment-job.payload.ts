// src/queue/payloads/sentiment-job.payload.ts
// Job payload for SENTIMENT_QUEUE — forwarded by PostWorker, consumed by SentimentWorker.

export interface SentimentJobPayload {
  /** Internal DB post ID — used to save the result */
  postId: string;
  /** Internal DB asset ID */
  assetId: string;
  /** Raw text to analyze */
  content: string;
  /** Whether whale detection flagged this post */
  isWhaleAlert: boolean;
  /** Confidence boost from whale detection (0–0.3) */
  confidenceBoost: number;
  /** Engagement metrics — used for impact scoring */
  authorFollowers: number;
  retweetCount: number;
  likeCount: number;
  /** User IDs who track this asset — needed to fetch their strategies */
  trackedByUserIds: string[];
}
