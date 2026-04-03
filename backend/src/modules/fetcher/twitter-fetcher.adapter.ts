// src/modules/fetcher/twitter-fetcher.adapter.ts
// Twitter API v2 adapter — implements SocialFetcherPort.
// Uses Bearer Token (app-only auth) for recent tweet search by user.
// NOTE: uses axios instead of built-in fetch — avoids undici HTTP/2 timeout
//       issues on Node.js v22+ (Node v25.2.1 confirmed affected).
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
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

interface TwitterErrorBody {
  title?: string;
  detail?: string;
  reset_date?: string;
}

@Injectable()
export class TwitterFetcherAdapter implements SocialFetcherPort {
  private readonly logger = new Logger(TwitterFetcherAdapter.name);
  private readonly bearerToken: string | null;
  private readonly baseUrl = 'https://api.twitter.com/2';
  readonly platform = 'TWITTER';

  /**
   * When non-null, the adapter is in "spend-cap backoff" and will not call
   * the Twitter API until this date. isConfigured() returns false during this
   * window so the fetcher falls back to mock posts automatically.
   */
  private spendCapDisabledUntil: Date | null = null;

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
    if (!this.bearerToken) return false;

    // Still in spend-cap backoff window?
    if (this.spendCapDisabledUntil && new Date() < this.spendCapDisabledUntil) {
      return false; // silently fall back to mock posts
    }

    // Re-enable once past the reset date
    if (this.spendCapDisabledUntil) {
      this.spendCapDisabledUntil = null;
      this.logger.log('🐦 Twitter spend-cap reset — re-enabling live fetching');
    }

    return true;
  }

  async fetchByChannel(handle: string, maxResults = 10, sinceHours = 48): Promise<SocialPost[] | null> {
    if (!this.isConfigured()) return null;

    // Strip @ prefix if present
    const cleanHandle = handle.replace(/^@/, '');

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

    // Use axios (HTTP/1.1) — built-in fetch/undici hangs on HTTP/2 with Node v22+
    let data: TwitterSearchResponse;
    try {
      const res = await axios.get<TwitterSearchResponse>(url, {
        headers: { Authorization: `Bearer ${this.bearerToken}` },
        timeout: 15_000,
        validateStatus: () => true,
      });

      if (res.status === 429) {
        this.logger.warn(`⚠️  Twitter rate limited for @${cleanHandle} — skipping`);
        return null;
      }

      if (res.status !== 200) {
        const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

        // SpendCapReached: disable adapter until the reset date
        if (res.status === 403) {
          const errBody = res.data as TwitterErrorBody;
          if (errBody?.title === 'SpendCapReached') {
            const resetDate = errBody.reset_date ? new Date(errBody.reset_date) : null;
            this.spendCapDisabledUntil = resetDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            this.logger.warn(
              `🚫 Twitter spend cap reached — disabling live fetch until ` +
              `${this.spendCapDisabledUntil.toISOString().split('T')[0]}. ` +
              `Falling back to mock posts automatically.`,
            );
            return null;
          }
        }

        this.logger.warn(`⚠️  Twitter API ${res.status} for @${cleanHandle}: ${body}`);
        return null;
      }

      data = res.data;
    } catch (err) {
      // Network-level failure: DNS, ECONNRESET, ETIMEDOUT, etc.
      const cause = err instanceof Error ? (err.cause ?? err.message) : String(err);
      this.logger.error(`❌ Twitter fetch failed for @${cleanHandle}: ${cause}`);
      return null;
    }

    if (!data.data?.length) {
      this.logger.debug(`No recent tweets from @${cleanHandle}`);
      return [];
    }

    // Build user lookup map
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
  }
}