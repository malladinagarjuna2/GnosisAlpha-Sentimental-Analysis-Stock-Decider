// src/modules/backtest/ports/trade-executor.port.ts
// Port interface for trade execution.
// Adapters: MockTradeExecutor (now), KiteTradeExecutor (future).

export interface TradeOrder {
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  priceAtSignal: number;
  timestamp: Date;
  reason: string;
}

export interface TradeResult {
  orderId: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  executedPrice: number;
  timestamp: Date;
  status: 'EXECUTED' | 'SIMULATED' | 'FAILED';
}

export interface TradeExecutorPort {
  /**
   * Execute a trade (or simulate it).
   */
  execute(order: TradeOrder): Promise<TradeResult>;

  /** Provider name */
  readonly providerName: string;

  /** Whether this executor places real orders */
  readonly isLive: boolean;
}
