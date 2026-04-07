// src/constants/queue.constants.ts

/** BullMQ queue: raw ingested posts waiting to be stored */
export const POST_QUEUE = 'post-queue';

/** BullMQ queue: stored posts waiting for sentiment analysis */
export const SENTIMENT_QUEUE = 'sentiment-queue';

/**
 * BullMQ queue: HTTP server → Worker control messages.
 * Used by FetcherController to trigger an immediate fetch in the worker process.
 */
export const FETCHER_CONTROL_QUEUE = 'fetcher-control-queue';

/** Job name for a single ingested post */
export const INGEST_POST_JOB = 'ingest-post';

/** Job name for a single sentiment analysis task */
export const ANALYZE_SENTIMENT_JOB = 'analyze-sentiment';

/** Job name: HTTP server asks worker to do an immediate fetch cycle */
export const TRIGGER_FETCH_JOB = 'trigger-fetch';
