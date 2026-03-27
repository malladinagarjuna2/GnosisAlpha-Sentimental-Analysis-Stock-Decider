// src/modules/fetcher/fetcher.service.ts
// LAYER 2: Fetcher — polls for data and dispatches jobs to postQueue.
// Injects SeederService to guarantee assets exist before the first poll.
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { SeederService } from './seeder.service';
import { generateMockPosts } from './mock-post.factory';
import { POST_QUEUE, INGEST_POST_JOB } from '../../constants/queue.constants';
import { PostSource } from '@prisma/client';
import type { PostJobPayload } from '../../queue/payloads/post-job.payload';

const POLL_INTERVAL_MS = 30_000;

@Injectable()
export class FetcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FetcherService.name);
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectQueue(POST_QUEUE) private readonly postQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly seeder: SeederService, // ensures assets are seeded before first poll
  ) {}

  async onModuleInit() {
    // Seed first, then poll — guaranteed ordering
    await this.seeder.seed();
    this.logger.log(`🚀 Fetcher started — polling every ${POLL_INTERVAL_MS / 1000}s`);
    await this.poll();
    this.pollTimer = setInterval(() => { void this.poll(); }, POLL_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.logger.log('Fetcher stopped');
    }
  }

  async poll(): Promise<void> {
    try {
      const posts = generateMockPosts(5);
      this.logger.log(`📥 Fetched ${posts.length} posts`);

      for (const post of posts) {
        const asset = await this.prisma.asset.findUnique({
          where: { symbol: post.assetSymbol },
          select: { id: true },
        });

        if (!asset) {
          this.logger.warn(`⚠️  No asset for symbol "${post.assetSymbol}" — skipping`);
          continue;
        }

        const payload: PostJobPayload = {
          externalId:      post.externalId,
          source:          PostSource.TWITTER,
          assetId:         asset.id,
          assetSymbol:     post.assetSymbol,
          content:         post.content,
          author:          post.author,
          authorFollowers: post.authorFollowers,
          retweetCount:    post.retweetCount,
          likeCount:       post.likeCount,
          postedAt:        post.postedAt.toISOString(),
        };

        await this.postQueue.add(INGEST_POST_JOB, payload, {
          removeOnComplete: true,
          removeOnFail: 5,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2_000 },
        });

        this.logger.log(
          `📤 Enqueued [${post.assetSymbol}] "${post.content.slice(0, 55)}..."`,
        );
      }
    } catch (err) {
      this.logger.error('❌ Poll failed', (err as Error).stack);
    }
  }
}
