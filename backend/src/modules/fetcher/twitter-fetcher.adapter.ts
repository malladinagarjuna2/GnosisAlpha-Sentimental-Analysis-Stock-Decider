// src/modules/fetcher/twitter-fetcher.adapter.ts
// Twitter API v2 adapter — implements SocialFetcherPort.
// Uses Bearer Token (app-only auth) for recent tweet search by user.
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SocialFetcherPort, SocialPost } from './social-fetcher.port';

interface TwitterTweet {
  id: string;
  text: string;
  author_id: string;
  public_metrics?: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    impression_count: number;
  };
  created_at?: string;
}

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  public_metrics?: { followers_count: number };
}

interface TwitterSearchResponse {
  data?: TwitterTweet[];
  includes?: { users?: TwitterUser[] };
  meta?: { result_count: number; next_token?: string };
}

@Injectable()
export class TwitterFetcherAdapter implements SocialFetcherPort {
  private readonly logger = new Logger(TwitterFetcherAdapter.name);
  private readonly bearerToken: string | null;
  private readonly baseUrl = 'https://api.twitter.com/2';
  readonly platform = 'TWITTER';

  constructor(private readonly config: ConfigService) {
    const token = this.config.get<string>('TWITTER_BEARER_TOKEN');
    if (token && token !== 'your_twitter_bearer_token') {
      this.bearerToken = token;
      this.logger.log('🐦 Twitter API adapter initialized');
    } else {
      this.bearerToken = null;
      this.logger.warn('⚠️  Twitter bearer token not configured — will use mock posts');
    }
  }

  isConfigured(): boolean {
    return this.bearerToken !== null;
  }

  async fetchByChannel(handle: string, maxResults = 10, sinceHours = 48): Promise<SocialPost[] | null> {
    if (!this.bearerToken) return null;

    // Strip @ prefix if present
    const cleanHandle = handle.replace(/^@/, '');

    try {
      // Build time window: only fetch posts from the last sinceHours
      const startTime = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();

      // Twitter v2: search recent tweets from a specific user
      const query = `from:${cleanHandle}`;
      const params = new URLSearchParams({
        query,
        max_results: String(Math.min(Math.max(maxResults, 10), 100)),
        start_time: startTime,
        'tweet.fields': 'created_at,author_id,public_metrics',
        expansions: 'author_id',
        'user.fields': 'username,name,public_metrics',
      });

      const url = `${this.baseUrl}/tweets/search/recent?${params}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.bearerToken}` },
      });

      if (response.status === 429) {
        this.logger.warn(`⚠️  Twitter rate limited for @${cleanHandle} — skipping`);
        return null;
      }

      if (!response.ok) {
        const body = await response.text();
        this.logger.warn(`⚠️  Twitter API ${response.status} for @${cleanHandle}: ${body}`);
        return null;
      }

      const data: TwitterSearchResponse = await response.json();

      if (!data.data?.length) {
        this.logger.debug(`No recent tweets from @${cleanHandle}`);
        return [];
      }

      // Build user lookup
      const userMap = new Map<string, TwitterUser>();
      for (const user of data.includes?.users ?? []) {
        userMap.set(user.id, user);
      }

      const posts: SocialPost[] = data.data.map((tweet) => {
        const user = userMap.get(tweet.author_id);
        return {
          externalId:      `twitter-${tweet.id}`,
          content:         tweet.text,
          author:          user?.username ?? cleanHandle,
          authorFollowers: user?.public_metrics?.followers_count ?? 0,
          retweetCount:    tweet.public_metrics?.retweet_count ?? 0,
          likeCount:       tweet.public_metrics?.like_count ?? 0,
          postedAt:        tweet.created_at ? new Date(tweet.created_at) : new Date(),
          url:             `https://twitter.com/${user?.username ?? cleanHandle}/status/${tweet.id}`,
        };
      });

      this.logger.log(`🐦 Fetched ${posts.length} tweets from @${cleanHandle}`);
      return posts;
    } catch (err) {
      this.logger.error(`❌ Twitter fetch failed for @${cleanHandle}`, (err as Error).message);
      return null;
    }
  }
}