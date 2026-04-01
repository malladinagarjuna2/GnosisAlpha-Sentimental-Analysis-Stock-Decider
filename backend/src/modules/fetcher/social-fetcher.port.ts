// src/modules/fetcher/social-fetcher.port.ts
// Platform-agnostic interface — every social platform adapter must implement this.
// Adding a new platform (Reddit, Telegram, etc.) = new adapter file, same contract.

export interface SocialPost {
  externalId: string;
  content: string;
  author: string;
  authorFollowers: number;
  retweetCount: number;   // or upvotes / reactions equivalent
  likeCount: number;
  postedAt: Date;
  url?: string;
}

export interface SocialFetcherPort {
  /** Human-readable platform name */
  readonly platform: string;

  /**
   * Fetch recent posts from a specific channel/account.
   * @param handle - username or channel identifier (e.g. "elonmusk")
   * @param maxResults - max posts to return
   * @param sinceHours - only fetch posts from the last N hours (default 48)
   * @returns array of posts, or null if API call failed
   */
  fetchByChannel(handle: string, maxResults?: number, sinceHours?: number): Promise<SocialPost[] | null>;

  /** Whether the adapter has valid credentials configured */
  isConfigured(): boolean;
}