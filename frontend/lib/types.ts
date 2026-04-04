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

// ─── New types: Multi-Agent Architecture ────────────────────────────────────

export type InvestHorizon = 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
export type AgentType = 'SENTIMENT' | 'ANALYSIS' | 'TRADING_ALGO';

export interface InvestorProfile {
  id: string;
  userId: string;
  riskTolerance: number;
  horizon: InvestHorizon;
  capitalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BacktestSignal {
  date: string;
  asset: string;
  action: 'BUY' | 'SELL';
  sentimentScore: number;
  trigger: string;
  source: string;
  trustScore: number;
  priceAtSignal: number;
}

export interface BacktestPerformance {
  projectedGainINR: number;
  projectedGainPct: number;
  winRate: string;
  totalTrades: number;
  profitableTrades: number;
  bestTrade: { asset: string; gainPct: number } | null;
  worstTrade: { asset: string; gainPct: number } | null;
}

export interface BacktestResult {
  strategyName: string;
  period: { from: string; to: string };
  assets: string[];
  capitalINR: number;
  totalTweetsAnalyzed: number;
  trustedSourcesUsed: string[];
  signals: BacktestSignal[];
  performance: BacktestPerformance;
  recommendation: string;
  priceDataProvider: string;
  tradeExecutor: string;
}

export interface AgentInfo {
  name: string;
  type: AgentType;
  version: string;
  healthy: boolean;
}

export interface AgentsResponse {
  agents: AgentInfo[];
  total: number;
  healthy: number;
  broker: {
    provider: string;
    isLive: boolean;
    note: string;
  };
}

export interface GeneratedStrategy {
  name: string;
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedWinRate: string;
  rationale: string;
  agentsUsed: string[];
  config: Strategy;
}
