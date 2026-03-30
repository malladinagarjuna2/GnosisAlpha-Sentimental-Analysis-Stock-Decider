// src/modules/workers/sentiment.worker.ts
// LAYER 3: Worker — consumes SENTIMENT_QUEUE jobs.
// Responsibilities: run NLP with user strategy keywords, persist result, trigger alerts.
// Never calls LLM. Never exposes HTTP. Never schedules anything.
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SentimentService } from '../sentiment/sentiment.service';
import { StrategiesService } from '../strategies/strategies.service';
import { AlertsService } from '../alerts/alerts.service';
import { SENTIMENT_QUEUE, ANALYZE_SENTIMENT_JOB } from '../../constants/queue.constants';
import { AnalysisMethod, AlertType } from '@prisma/client';
import type { SentimentJobPayload } from '../../queue/payloads/sentiment-job.payload';

@Processor(SENTIMENT_QUEUE)
export class SentimentWorker extends WorkerHost {
  private readonly logger = new Logger(SentimentWorker.name);

  constructor(
    private readonly sentimentService: SentimentService,
    private readonly strategiesService: StrategiesService,
    private readonly alertsService: AlertsService,
  ) {
    super();
  }

  async process(job: Job<SentimentJobPayload>): Promise<void> {
    if (job.name !== ANALYZE_SENTIMENT_JOB) return;

    const { postId, content, isWhaleAlert, confidenceBoost,
            authorFollowers, retweetCount, likeCount, trackedByUserIds } = job.data;

    this.logger.log(`🧠 [SentimentWorker] job=${job.id} post=${postId}`);

    // 1. Use first tracked user's strategy for keyword enrichment (or defaults)
    const primaryUserId = trackedByUserIds?.[0];
    const config = primaryUserId
      ? await this.strategiesService.getActiveConfig(primaryUserId)
      : undefined;

    // 2. Fast NLP with custom strategy keywords — NEVER triggers LLM here
    const result = await this.sentimentService.analyzeWithNlp({
      postId,
      text: content,
      authorFollowers,
      retweetCount,
      likeCount,
      customKeywordsPositive: config?.keywordsPositive,
      customKeywordsNegative: config?.keywordsNegative,
    });

    // 3. Apply whale confidence boost (additive, capped at 1.0)
    const finalConfidence = Math.min(result.confidence + confidenceBoost, 1);
    const finalResult = { ...result, confidence: finalConfidence, isWhaleAlert };

    // 4. Persist sentiment result
    const saved = await this.sentimentService.saveResult(postId, finalResult, AnalysisMethod.NLP);

    this.logger.log(
      `✅ Sentiment stored [${postId}] — ` +
      `score=${saved.sentimentScore.toFixed(2)} ` +
      `impact=${saved.impactScore} ` +
      `category=${saved.category} ` +
      `whale=${isWhaleAlert}`,
    );

    // 5. Per-user strategy evaluation — trigger alerts if thresholds met
    for (const userId of (trackedByUserIds ?? [])) {
      const userConfig = await this.strategiesService.getActiveConfig(userId);
      const shouldAlert = this.strategiesService.evaluate(userConfig, {
        sentimentScore: saved.sentimentScore,
        impactScore:    saved.impactScore,
        confidence:     saved.confidence,
        category:       saved.category,
      });

      if (shouldAlert) {
        await this.alertsService.create({
          userId,
          type: AlertType.IN_APP,
          message:
            `Sentiment alert on post [${postId}]: ` +
            `score=${saved.sentimentScore.toFixed(2)}, ` +
            `impact=${saved.impactScore}, ` +
            `category=${saved.category}`,
          metadata: { postId, sentimentScore: saved.sentimentScore, impactScore: saved.impactScore },
        });
        this.logger.log(`🔔 Alert triggered for user [${userId}] on post [${postId}]`);
      }
    }
  }
}
