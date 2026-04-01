// src/modules/fetcher/fetcher.service.ts
// LAYER 2: Fetcher — polls social channels and dispatches jobs to postQueue.
// Uses platform-agnostic adapters (Twitter first, Reddit later).
// Falls back to mock posts if no real API is configured.
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { SeederService } from './seeder.service';
import { TwitterFetcherAdapter } from './twitter-fetcher.adapter';
import { ChannelsService } from '../channels/channels.service';
import { generateMockPosts } from './mock-post.factory';
import { POST_QUEUE, INGEST_POST_JOB } from '../../constants/queue.constants';
import { PostSource, SocialPlatform } from '@prisma/client';
import type { PostJobPayload } from '../../queue/payloads/post-job.payload';
import type { SocialPost } from './social-fetcher.port';

const POLL_INTERVAL_MS = 30_000;

@Injectable()
export class FetcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FetcherService.name);
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectQueue(POST_QUEUE) private readonly postQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly seeder: SeederService,
    private readonly twitterAdapter: TwitterFetcherAdapter,
    private readonly channelsService: ChannelsService,
  ) {}

  async onModuleInit() {
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
      // Try real API fetching from followed channels
      if (this.twitterAdapter.isConfigured()) {
        await this.pollRealChannels();
      } else {
        // Fallback: mock posts
        await this.pollMock();
      }
    } catch (err) {
      this.logger.error('❌ Poll failed', (err as Error).stack);
    }
  }

  /** Fetch from real Twitter channels that users are following */
  private async pollRealChannels(): Promise<void> {
    const channels = await this.channelsService.getActiveChannelsByPlatform(SocialPlatform.TWITTER);

    if (channels.length === 0) {
      this.logger.debug('No active Twitter channels followed by any user — using mock');
      await this.pollMock();
      return;
    }

    let totalEnqueued = 0;

    for (const channel of channels) {
      const posts = await this.twitterAdapter.fetchByChannel(channel.handle, 10, 48);
      if (!posts || posts.length === 0) continue;

      for (const post of posts) {
        await this.enqueuePost(post, PostSource.TWITTER);
        totalEnqueued++;
      }
    }

    this.logger.log(`📥 Polled ${channels.length} channels — enqueued ${totalEnqueued} posts`);

    // If no real posts were fetched, supplement with mock
    if (totalEnqueued === 0) {
      this.logger.log('📥 No real posts found — supplementing with mock data');
      await this.pollMock();
    }
  }

  /** Fallback: generate mock posts */
  private async pollMock(): Promise<void> {
    const posts = generateMockPosts(5);
    this.logger.log(`📥 Fetched ${posts.length} mock posts`);

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
  }

  /** Enqueue a real social post — resolves asset from content keywords */
  private async enqueuePost(post: SocialPost, source: PostSource): Promise<void> {
    // Try to match the post content to one of our tracked assets
    const assets = await this.prisma.asset.findMany({ select: { id: true, symbol: true } });
    const matchedAsset = this.matchAsset(post.content, assets);

    if (!matchedAsset) {
      // If no specific asset matched, use the first available asset as general market post
      const firstAsset = assets[0];
      if (!firstAsset) return;

      await this.addToQueue(post, source, firstAsset.id, firstAsset.symbol);
      return;
    }

    await this.addToQueue(post, source, matchedAsset.id, matchedAsset.symbol);
  }

  /** Match post content to a tracked asset using symbol/name keywords */
  private matchAsset(
    content: string,
    assets: { id: string; symbol: string }[],
  ): { id: string; symbol: string } | null {
    const lower = content.toLowerCase();

    // Asset keyword mappings (extensible)
    const ASSET_KEYWORDS: Record<string, string[]> = {
      BTC:  ['bitcoin', 'btc', '$btc'],
      ETH:  ['ethereum', 'eth', '$eth'],
      SOL:  ['solana', 'sol', '$sol'],
      TSLA: ['tesla', 'tsla', '$tsla'],
      AAPL: ['apple', 'aapl', '$aapl'],
    };

    for (const asset of assets) {
      const keywords = ASSET_KEYWORDS[asset.symbol] ?? [asset.symbol.toLowerCase()];
      if (keywords.some(k => lower.includes(k))) {
        return asset;
      }
    }
    return null;
  }

  private async addToQueue(
    post: SocialPost,
    source: PostSource,
    assetId: string,
    assetSymbol: string,
  ): Promise<void> {
    const payload: PostJobPayload = {
      externalId:      post.externalId,
      source,
      assetId,
      assetSymbol,
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
      `📤 Enqueued [${assetSymbol}] @${post.author}: "${post.content.slice(0, 50)}..."`,
    );
  }
}
