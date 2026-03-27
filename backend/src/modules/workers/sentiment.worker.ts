// src/modules/workers/sentiment.worker.ts
// LAYER 3: Worker — consumes SENTIMENT_QUEUE jobs.
// Single responsibility: run NLP analysis and persist the result.
// Never calls LLM. Never exposes HTTP. Never schedules anything.
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SentimentService } from '../sentiment/sentiment.service';
import { SENTIMENT_QUEUE, ANALYZE_SENTIMENT_JOB } from '../../constants/queue.constants';
import { AnalysisMethod } from '@prisma/client';
import type { SentimentJobPayload } from '../../queue/payloads/sentiment-job.payload';

@Processor(SENTIMENT_QUEUE)
export class SentimentWorker extends WorkerHost {
  private readonly logger = new Logger(SentimentWorker.name);

  constructor(private readonly sentimentService: SentimentService) {
    super();
  }

  async process(job: Job<SentimentJobPayload>): Promise<void> {
    if (job.name !== ANALYZE_SENTIMENT_JOB) return;

    const { postId, content, isWhaleAlert, confidenceBoost } = job.data;

    this.logger.log(`🧠 [SentimentWorker] job=${job.id} post=${postId}`);

    // 1. Fast NLP — NEVER triggers LLM here
    const result = await this.sentimentService.analyzeWithNlp({ postId, text: content });

    // 2. Apply whale confidence boost (additive, capped at 1.0)
    const finalConfidence = Math.min(result.confidence + confidenceBoost, 1);

    // 3. Persist
    const saved = await this.sentimentService.saveResult(
      postId,
      { ...result, confidence: finalConfidence, isWhaleAlert },
      AnalysisMethod.NLP,
    );

    this.logger.log(
      `✅ Sentiment stored [${postId}] — ` +
      `score=${saved.sentimentScore.toFixed(2)} ` +
      `impact=${saved.impactScore} ` +
      `category=${saved.category} ` +
      `whale=${isWhaleAlert}`,
    );
  }
}
