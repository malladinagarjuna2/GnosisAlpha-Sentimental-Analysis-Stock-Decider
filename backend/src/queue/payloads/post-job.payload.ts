// src/queue/payloads/post-job.payload.ts
// Job payload for POST_QUEUE — the shape of every job the fetcher enqueues.
import type { PostSource } from '@prisma/client';

export interface PostJobPayload {
  /** Unique external ID from the source platform — used for idempotent upsert */
  externalId: string;
  source: PostSource;
  /** Internal DB asset ID */
  assetId: string;
  /** Symbol for logging (BTC, ETH, TSLA…) */
  assetSymbol: string;
  content: string;
  author: string;
  /** Author follower count — used by whale detection */
  authorFollowers: number;
  retweetCount: number;
  likeCount: number;
  /** ISO string — must be serialized across queue boundary */
  postedAt: string;
}
