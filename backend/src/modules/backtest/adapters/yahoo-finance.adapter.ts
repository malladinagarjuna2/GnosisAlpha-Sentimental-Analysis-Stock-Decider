// src/modules/backtest/adapters/yahoo-finance.adapter.ts
// PriceDataPort adapter using yahoo-finance2 v3.
// For NSE stocks, appends '.NS' suffix automatically.
// Swap this for KiteAdapter later without touching any consumer code.
import { Injectable, Logger } from '@nestjs/common';
import type { PriceDataPort, OHLCV } from '../ports/price-data.port';

// yahoo-finance2 v3: require().default is the constructor
// eslint-disable-next-line @typescript-eslint/no-var-requires
const YahooFinance = require('yahoo-finance2').default;

/** Maps our internal symbols to Yahoo Finance tickers */
const NSE_SUFFIX = '.NS';

@Injectable()
export class YahooFinanceAdapter implements PriceDataPort {
  private readonly logger = new Logger(YahooFinanceAdapter.name);
  private readonly yf: any;
  readonly providerName = 'Yahoo Finance';

  constructor() {
    this.yf = new YahooFinance();
  }

  private toYahooSymbol(symbol: string): string {
    if (symbol.includes('.')) return symbol;
    return `${symbol}${NSE_SUFFIX}`;
  }

  async getHistoricalPrices(
    symbol: string,
    fromDate: Date,
    toDate: Date,
    interval: '1d' | '1h' = '1d',
  ): Promise<OHLCV[]> {
    const yahooSymbol = this.toYahooSymbol(symbol);

    try {
      const result = await this.yf.chart(yahooSymbol, {
        period1: fromDate.toISOString().split('T')[0],
        period2: toDate.toISOString().split('T')[0],
        interval,
      });

      if (!result?.quotes?.length) {
        this.logger.warn(`📊 No price data for ${yahooSymbol}`);
        return [];
      }

      const prices: OHLCV[] = result.quotes
        .filter((q: any) => q.close != null)
        .map((q: any) => ({
          date: new Date(q.date),
          open: q.open ?? q.close,
          high: q.high ?? q.close,
          low: q.low ?? q.close,
          close: q.close,
          volume: q.volume ?? 0,
        }));

      this.logger.log(`📊 Fetched ${prices.length} price points for ${yahooSymbol} (${interval})`);
      return prices;
    } catch (err) {
      this.logger.error(`❌ Yahoo Finance error for ${yahooSymbol}: ${(err as Error).message}`);
      return [];
    }
  }

  async getLatestPrice(symbol: string): Promise<number | null> {
    const yahooSymbol = this.toYahooSymbol(symbol);
    try {
      const result = await this.yf.quote(yahooSymbol);
      return result?.regularMarketPrice ?? null;
    } catch {
      return null;
    }
  }
}
