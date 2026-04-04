// src/modules/backtest/ports/price-data.port.ts
// Port interface for historical price data providers.
// Adapters: YahooFinanceAdapter (now), KiteAdapter (future).

export interface OHLCV {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceDataPort {
  /**
   * Fetch historical OHLCV data for a given stock symbol.
   * @param symbol   — e.g. 'RELIANCE', 'TCS'  (adapter handles exchange suffix)
   * @param fromDate — start date
   * @param toDate   — end date
   * @param interval — '1d' | '1h'
   */
  getHistoricalPrices(
    symbol: string,
    fromDate: Date,
    toDate: Date,
    interval: '1d' | '1h',
  ): Promise<OHLCV[]>;

  /** Get the latest price for a symbol */
  getLatestPrice(symbol: string): Promise<number | null>;

  /** Provider name (for logging / display) */
  readonly providerName: string;
}
