// src/modules/backtest/dto/backtest-result.dto.ts

export interface BacktestSignal {
  date: string;
  asset: string;
  action: 'BUY' | 'SELL';
  sentimentScore: number;
  trigger: string;           // tweet content snippet
  source: string;            // channel handle
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
