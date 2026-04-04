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

const POLL_INTERVAL_MS = 30000_000;

@Injectable()
export class FetcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FetcherService.name);
  private pollTimer: NodeJS.Timeout | null = null;

  /**
   * Tracks the last successful fetch time per channel handle.
   * Used to compute a dynamic sinceHours window — only fetches NEW tweets.
   * First fetch defaults to 2h lookback.
   */
  private readonly lastFetchedAt = new Map<string, Date>();

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

  /** Called on schedule (every 30s) — also called directly by FetcherRefreshWorker */
  async poll(): Promise<{ enqueued: number }> {
    try {
      if (this.twitterAdapter.isConfigured()) {
        return await this.pollRealChannels();
      } else {
        return await this.pollMock();
      }
    } catch (err) {
      this.logger.error('❌ Poll failed', (err as Error).stack);
      return { enqueued: 0 };
    }
  }

  /** Returns current lastFetchedAt map (for status endpoint) */
  getStatus(): { lastFetchedAt: Record<string, string> } {
    const result: Record<string, string> = {};
    for (const [handle, date] of this.lastFetchedAt.entries()) {
      result[handle] = date.toISOString();
    }
    return { lastFetchedAt: result };
  }

  /** Fetch from real Twitter channels that users are following */
  private async pollRealChannels(): Promise<{ enqueued: number }> {
    const channels = await this.channelsService.getActiveChannelsByPlatform(SocialPlatform.TWITTER);

    if (channels.length === 0) {
      this.logger.debug('No active Twitter channels followed by any user — using mock');
      return await this.pollMock();
    }

    let totalEnqueued = 0;

    for (const channel of channels) {
      // Dynamic window: only fetch tweets since last successful fetch for this channel.
      // First fetch defaults to 2h lookback.
      const lastFetch = this.lastFetchedAt.get(channel.handle);
      const sinceHours = lastFetch
        ? Math.max(Math.ceil((Date.now() - lastFetch.getTime()) / 3_600_000) + 1, 1)
        : 2;

      const fetchStart = new Date(); // record before fetch so we don't miss posts on concurrent fetches
      const posts = await this.twitterAdapter.fetchByChannel(channel.handle, 10, sinceHours);

      if (!posts || posts.length === 0) continue;

      for (const post of posts) {
        await this.enqueuePost(post, PostSource.TWITTER);
        totalEnqueued++;
      }

      // Update lastFetchedAt only on success
      this.lastFetchedAt.set(channel.handle, fetchStart);
    }

    this.logger.log(`📥 Polled ${channels.length} channels — enqueued ${totalEnqueued} posts`);

    if (totalEnqueued === 0) {
      this.logger.log('📥 No real posts found — supplementing with mock data');
      return await this.pollMock();
    }

    return { enqueued: totalEnqueued };
  }

  /** Fallback: generate mock posts */
  private async pollMock(): Promise<{ enqueued: number }> {
    const posts = generateMockPosts(5);
    this.logger.log(`📥 Fetched ${posts.length} mock posts`);
    let enqueued = 0;

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
      enqueued++;

      this.logger.log(
        `📤 Enqueued [${post.assetSymbol}] "${post.content.slice(0, 55)}..."`,
      );
    }

    return { enqueued };
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

    // NSE/BSE stock keyword mappings (extensible)
    const ASSET_KEYWORDS: Record<string, string[]> = {
      RELIANCE:   ['reliance', 'ril', '$reliance', 'jio', 'mukesh ambani'],
      TCS:        ['tcs', 'tata consultancy', '$tcs'],
      INFY:       ['infosys', 'infy', '$infy', 'narayana murthy'],
      HDFCBANK:   ['hdfc bank', 'hdfcbank', '$hdfcbank', 'hdfc'],
      ICICIBANK:  ['icici bank', 'icicibank', '$icicibank', 'icici'],
      SBIN:       ['sbi', 'sbin', '$sbin', 'state bank'],
      WIPRO:      ['wipro', '$wipro'],
      TATAMOTORS: ['tata motors', 'tatamotors', '$tatamotors', 'tata ev', 'jlr', 'nexon'],
      BAJFINANCE: ['bajaj finance', 'bajfinance', '$bajfinance'],
      LT:         ['larsen', 'l&t', '$lt', 'larsen toubro'],
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
