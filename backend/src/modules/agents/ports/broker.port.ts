// src/modules/agents/ports/broker.port.ts
// Universal broker abstraction — MockBroker now, Kite/Alpaca/anything later.
// Re-exports the existing price port so brokers can optionally provide prices too.

export type { OHLCV, PriceDataPort } from '../../backtest/ports/price-data.port';
export type { TradeOrder, TradeResult, TradeExecutorPort } from '../../backtest/ports/trade-executor.port';

/**
 * Combined broker interface.
 * A broker MAY provide price data + trade execution + portfolio.
 * Adapters implement what they support.
 */
export interface BrokerPort {
  readonly providerName: string;
  readonly isLive: boolean;

  // ── Required: trade execution ────────────────────────────────────────────
  execute(order: import('../../backtest/ports/trade-executor.port').TradeOrder):
    Promise<import('../../backtest/ports/trade-executor.port').TradeResult>;

  // ── Optional: price data (if broker provides it) ─────────────────────────
  getHistoricalPrices?(
    symbol: string, fromDate: Date, toDate: Date, interval: '1d' | '1h',
  ): Promise<import('../../backtest/ports/price-data.port').OHLCV[]>;

  getLatestPrice?(symbol: string): Promise<number | null>;

  // ── Optional: portfolio / positions ──────────────────────────────────────
  getPortfolio?(): Promise<{ symbol: string; quantity: number; avgPrice: number }[]>;
}
