// src/constants/queue.constants.ts

/** BullMQ queue: raw ingested posts waiting to be stored */
export const POST_QUEUE = 'post-queue';

/** BullMQ queue: stored posts waiting for sentiment analysis */
export const SENTIMENT_QUEUE = 'sentiment-queue';

/** Job name for a single ingested post */
export const INGEST_POST_JOB = 'ingest-post';

/** Job name for a single sentiment analysis task */
export const ANALYZE_SENTIMENT_JOB = 'analyze-sentiment';
