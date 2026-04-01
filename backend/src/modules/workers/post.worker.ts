// src/modules/workers/post.worker.ts
// LAYER 3: Worker — consumes POST_QUEUE jobs.
// Responsibilities: store post to DB, run whale detection, dispatch to sentimentQueue.
// No HTTP, no scheduling, no business logic beyond orchestration.
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { WhaleService } from '../whale/whale.service';
import {
  POST_QUEUE,
  INGEST_POST_JOB,
  SENTIMENT_QUEUE,
  ANALYZE_SENTIMENT_JOB,
} from '../../constants/queue.constants';
import type { PostJobPayload } from '../../queue/payloads/post-job.payload';
import type { SentimentJobPayload } from '../../queue/payloads/sentiment-job.payload';
import { EventsBridgeService } from '../events/events-bridge.service';

@Processor(POST_QUEUE)
export class PostWorker extends WorkerHost {
  private readonly logger = new Logger(PostWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whaleService: WhaleService,
    private readonly eventsBridge: EventsBridgeService,
    @InjectQueue(SENTIMENT_QUEUE) private readonly sentimentQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<PostJobPayload>): Promise<void> {
    if (job.name !== INGEST_POST_JOB) return;

    const { externalId, source, assetId, assetSymbol, content,
            author, authorFollowers, retweetCount, likeCount, postedAt } = job.data;

    this.logger.log(`⚙️  [PostWorker] job=${job.id} asset=${assetSymbol}`);

    // 1. Persist (idempotent upsert — externalId is unique)
    const post = await this.prisma.post.upsert({
      where:  { externalId },
      create: { externalId, source, assetId, content, author, postedAt: new Date(postedAt) },
      update: {},
    });
    this.logger.log(`💾 Post stored [${post.id}]`);

    // 1b. Emit new-post event via Redis pub/sub → WebSocket
    await this.eventsBridge.publish({
      event: 'new-post',
      data: { postId: post.id, assetSymbol, content: content.slice(0, 200), author: author ?? '' },
    });

    // 2. Whale detection
    const whale = this.whaleService.detect({ content, authorFollowers, retweetCount, likeCount });
    if (whale.isWhale) {
      this.logger.warn(`🐋 Whale detected [${post.id}]: ${whale.reason}`);
    }

    // 3. Find users who track this asset (for per-user strategy evaluation)
    const prefs = await this.prisma.userPreference.findMany({
      where: { assetId },
      select: { userId: true },
    });
    const trackedByUserIds = prefs.map(p => p.userId);

    // 4. Dispatch to sentimentQueue
    const sentimentPayload: SentimentJobPayload = {
      postId:           post.id,
      assetId,
      content,
      isWhaleAlert:     whale.isWhale,
      confidenceBoost:  whale.confidenceBoost,
      authorFollowers,
      retweetCount,
      likeCount,
      trackedByUserIds,
    };

    await this.sentimentQueue.add(ANALYZE_SENTIMENT_JOB, sentimentPayload, {
      removeOnComplete: true,
      removeOnFail: 5,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1_000 },
    });

    this.logger.log(`📤 Post [${post.id}] → sentimentQueue`);
  }
}
