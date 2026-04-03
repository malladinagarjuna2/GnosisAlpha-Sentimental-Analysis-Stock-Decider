import { apiClient } from './api-client';
import {
  User,
  Asset,
  Post,
  UserPreference,
  Strategy,
  Alert,
  SocialChannel,
  DeepAnalysis,
  AuthResponse,
} from './types';

const api = apiClient.instance;

// Auth
export const authAPI = {
  signup: (email: string, password: string, name?: string) =>
    api.post<AuthResponse>('/auth/signup', { email, password, name }),
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  getMe: () => api.get<User>('/users/me'),
};

// Assets
export const assetsAPI = {
  getAll: () => api.get<Asset[]>('/assets'),
  getOne: (id: string) => api.get<Asset>(`/assets/${id}`),
  getTracked: () => api.get<Asset[]>('/assets/tracked/me'),
  create: (name: string, symbol: string, type: 'CRYPTO' | 'STOCK') =>
    api.post<Asset>('/assets', { name, symbol, type }),
  add: (assetId: string) => api.post<UserPreference>('/assets/add', { assetId }),
  remove: (assetId: string) =>
    api.delete('/assets/remove', { data: { assetId } }),
};

// Preferences
export const preferencesAPI = {
  getAll: () => api.get<UserPreference[]>('/preferences'),
  create: (assetId: string, alertEnabled?: boolean) =>
    api.post<UserPreference>('/preferences', { assetId, alertEnabled }),
  toggleAlert: (assetId: string) =>
    api.patch<UserPreference>(`/preferences/${assetId}/toggle-alert`, {}),
};

// Posts
export const postsAPI = {
  getAll: (params?: { assetId?: string; source?: string; limit?: number }) =>
    api.get<Post[]>('/posts', { params }),
  getByAsset: (assetId: string, limit?: number) =>
    api.get<Post[]>(`/posts/asset/${assetId}`, { params: { limit } }),
  getOne: (id: string) => api.get<Post>(`/posts/${id}`),
  create: (data: {
    assetId: string;
    source: 'TWITTER' | 'REDDIT';
    content: string;
    author?: string;
    url?: string;
    postedAt?: string;
  }) => api.post<Post>('/posts', data),
};

// Sentiment Analysis
export const sentimentAPI = {
  analyzeLLM: (postId: string, text: string) =>
    api.post(`/sentiment/analyze-llm/${postId}`, { text }),
};

// Deep Analysis
export const analysisAPI = {
  deep: (postId: string) =>
    api.post<DeepAnalysis>('/analysis/deep', { postId }),
};

// Strategies
export const strategiesAPI = {
  get: () => api.get<Strategy>('/strategies/strategy'),
  update: (data: Partial<Strategy>) =>
    api.post<Strategy>('/strategies/strategy/update', data),
};

// Alerts
export const alertsAPI = {
  getAll: () => api.get<Alert[]>('/alerts'),
};

// Channels
export const channelsAPI = {
  getAll: () =>
    api.get<{ defaults: SocialChannel[]; custom: SocialChannel[] }>(
      '/channels'
    ),
  getFollowed: () => api.get<SocialChannel[]>('/channels/followed'),
  follow: (channelId: string) =>
    api.post('/channels/follow', { channelId }),
  unfollow: (channelId: string) =>
    api.delete('/channels/unfollow', { data: { channelId } }),
  createCustom: (platform: 'TWITTER' | 'REDDIT', handle: string, displayName?: string) =>
    api.post<SocialChannel>('/channels/custom', {
      platform,
      handle,
      displayName,
    }),
};

// Health
export const healthAPI = {
  check: () => api.get('/health'),
};
