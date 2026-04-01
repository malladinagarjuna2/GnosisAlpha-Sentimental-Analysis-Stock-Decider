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
import { UsersService } from '../users/users.service';
import { SENTIMENT_QUEUE, ANALYZE_SENTIMENT_JOB } from '../../constants/queue.constants';
import { AnalysisMethod, AlertType } from '@prisma/client';
import type { SentimentJobPayload } from '../../queue/payloads/sentiment-job.payload';
import { EventsBridgeService } from '../events/events-bridge.service';

@Processor(SENTIMENT_QUEUE)
export class SentimentWorker extends WorkerHost {
  private readonly logger = new Logger(SentimentWorker.name);

  constructor(
    private readonly sentimentService: SentimentService,
    private readonly strategiesService: StrategiesService,
    private readonly alertsService: AlertsService,
    private readonly usersService: UsersService,
    private readonly eventsBridge: EventsBridgeService,
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

    // 4b. Emit new-sentiment event via Redis pub/sub → WebSocket
    await this.eventsBridge.publish({
      event: 'new-sentiment',
      data: {
        postId,
        sentimentScore: saved.sentimentScore,
        impactScore: saved.impactScore,
        confidence: saved.confidence,
        category: saved.category,
        isWhaleAlert,
      },
    });

    // 5. Per-user strategy evaluation — trigger alerts if thresholds met
    this.logger.log(`👥 trackedByUserIds for post [${postId}]: [${(trackedByUserIds ?? []).join(', ')}]`);

    for (const userId of (trackedByUserIds ?? [])) {
      const userConfig = await this.strategiesService.getActiveConfig(userId);
      const shouldAlert = this.strategiesService.evaluate(userConfig, {
        sentimentScore: saved.sentimentScore,
        impactScore:    saved.impactScore,
        confidence:     saved.confidence,
        category:       saved.category,
      });
      this.logger.log(
        `🔍 Evaluate user=[${userId}] shouldAlert=${shouldAlert} ` +
        `confidence=${saved.confidence.toFixed(2)} >= ${userConfig.confidenceThreshold} | ` +
        `impact=${saved.impactScore} >= ${userConfig.impactThreshold} | ` +
        `category=${saved.category} in [${userConfig.categories?.join(',')}]`,
      );

      if (shouldAlert) {
        const alertMessage =
          `Sentiment alert — ` +
          `score=${saved.sentimentScore.toFixed(2)}, ` +
          `impact=${saved.impactScore}, ` +
          `category=${saved.category}` +
          (isWhaleAlert ? ', 🐋 WHALE DETECTED' : '');

        // Store IN_APP alert
        const alert = await this.alertsService.create({
          userId,
          type: AlertType.IN_APP,
          message: alertMessage,
          metadata: {
            postId,
            sentimentScore: saved.sentimentScore,
            impactScore:    saved.impactScore,
            category:       saved.category,
            isWhaleAlert,
          },
        });

        this.logger.log(`🔔 Alert triggered for user [${userId}] on post [${postId}]`);

        // 5b. Emit new-alert event via Redis pub/sub → WebSocket
        await this.eventsBridge.publish({
          event: 'new-alert',
          data: {
            userId,
            alertId: alert.id,
            message: alertMessage,
            type: AlertType.IN_APP,
            metadata: { postId, sentimentScore: saved.sentimentScore, impactScore: saved.impactScore, category: saved.category, isWhaleAlert },
          },
        });

        // Send email alert (optional — skipped if SMTP not configured)
        const user = await this.usersService.findById(userId);
        if (user?.email) {
          const subject = `Market Alert: ${saved.category} signal detected`;
          const body =
            `A sentiment signal was detected matching your strategy.\n\n` +
            `Post ID: ${postId}\n` +
            `Sentiment Score: ${saved.sentimentScore.toFixed(2)}\n` +
            `Impact Score: ${saved.impactScore}/100\n` +
            `Confidence: ${(saved.confidence * 100).toFixed(0)}%\n` +
            `Category: ${saved.category}\n` +
            (isWhaleAlert ? `🐋 Whale Activity Detected\n` : '') +
            `\nLog in to Market Sentiment Intelligence to view the full post.`;

          await this.alertsService.sendEmailAlert(user.email, subject, body);
          await this.alertsService.markSent(alert.id);
        }
      }
    }
  }
}
