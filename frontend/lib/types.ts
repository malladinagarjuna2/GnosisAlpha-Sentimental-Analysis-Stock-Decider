export type AssetType = 'CRYPTO' | 'STOCK';
export type PostSource = 'TWITTER' | 'REDDIT';
export type SocialPlatform = 'TWITTER' | 'REDDIT';
export type SentimentCategory = 'SOCIAL_BUZZ' | 'NEWS' | 'RUMOR' | 'WHALE_ACTIVITY';
export type AnalysisMethod = 'NLP' | 'LLM';
export type AlertType = 'IN_APP' | 'EMAIL';
export type Sentiment = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export interface User {
  id: string;
  email: string;
  name: string;
  isVerified: boolean;
  createdAt: string;
}

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: AssetType;
  createdAt: string;
  updatedAt: string;
}

export interface SentimentData {
  id: string;
  postId: string;
  sentimentScore: number;
  impactScore: number;
  confidence: number;
  category: SentimentCategory;
  reason: string;
  isWhaleAlert: boolean;
  analyzedBy: AnalysisMethod;
}

export interface Post {
  id: string;
  assetId: string;
  source: PostSource;
  externalId: string;
  content: string;
  author: string;
  url: string;
  postedAt: string;
  createdAt: string;
  asset?: Asset;
  sentiment?: SentimentData;
}

export interface UserPreference {
  id: string;
  userId: string;
  assetId: string;
  alertEnabled: boolean;
  asset: Asset;
}

export interface Strategy {
  keywordsPositive: string[];
  keywordsNegative: string[];
  impactThreshold: number;
  confidenceThreshold: number;
  sentimentWeight: number;
  impactWeight: number;
  sentimentThreshold: number;
  categories: SentimentCategory[];
}

export interface Alert {
  id: string;
  userId: string;
  type: AlertType;
  message: string;
  metadata: {
    postId: string;
    sentimentScore: number;
    impactScore: number;
    category: SentimentCategory;
    isWhaleAlert: boolean;
  };
  sentAt: boolean;
  createdAt: string;
}

export interface SocialChannel {
  id: string;
  platform: SocialPlatform;
  handle: string;
  displayName: string;
  isDefault: boolean;
  createdByUserId: string | null;
  createdAt: string;
}

export interface UserChannel {
  id: string;
  userId: string;
  channelId: string;
  channel: SocialChannel;
  createdAt: string;
}

export interface DeepAnalysis {
  postId: string;
  summary: string;
  sentiment: Sentiment;
  reasoning: string;
  keyThemes: string[];
  riskLevel: string;
  recommendation: string;
  analyzedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user?: User;
}
