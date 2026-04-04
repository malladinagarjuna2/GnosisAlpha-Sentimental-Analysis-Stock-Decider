// src/modules/backtest/trade-simulator.ts
// Pure function — takes chronological signals + price data → computes P&L.
// No DI, no side effects. Testable in isolation.

import type { OHLCV } from './ports/price-data.port';
import type { BacktestSignal, BacktestPerformance } from './dto/backtest-result.dto';

interface SimulationInput {
  signals: BacktestSignal[];
  pricesByAsset: Map<string, OHLCV[]>;
  capitalINR: number;
}

interface CompletedTrade {
  asset: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  gainINR: number;
  gainPct: number;
}

/**
 * Simulate trades from sentiment signals against actual price data.
 *
 * Strategy: simplified long-only
 * - BUY signal → allocate equal capital per asset, buy at signal price
 * - SELL signal → sell entire position at signal price
 * - Any open positions at end → mark-to-market at last known close
 */
export function simulateTrades(input: SimulationInput): BacktestPerformance {
  const { signals, pricesByAsset, capitalINR } = input;

  // Sort signals chronologically
  const sorted = [...signals].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const uniqueAssets = [...new Set(sorted.map(s => s.asset))];
  const capitalPerAsset = capitalINR / Math.max(uniqueAssets.length, 1);

  // Track open positions per asset
  const openPositions = new Map<string, { buyPrice: number; quantity: number }>();
  const completedTrades: CompletedTrade[] = [];

  for (const signal of sorted) {
    if (signal.action === 'BUY' && !openPositions.has(signal.asset)) {
      // Open a position
      const quantity = Math.floor(capitalPerAsset / signal.priceAtSignal);
      if (quantity > 0) {
        openPositions.set(signal.asset, {
          buyPrice: signal.priceAtSignal,
          quantity,
        });
      }
    } else if (signal.action === 'SELL' && openPositions.has(signal.asset)) {
      // Close the position
      const pos = openPositions.get(signal.asset)!;
      const gainINR = (signal.priceAtSignal - pos.buyPrice) * pos.quantity;
      const gainPct = ((signal.priceAtSignal - pos.buyPrice) / pos.buyPrice) * 100;

      completedTrades.push({
        asset: signal.asset,
        buyPrice: pos.buyPrice,
        sellPrice: signal.priceAtSignal,
        quantity: pos.quantity,
        gainINR: parseFloat(gainINR.toFixed(2)),
        gainPct: parseFloat(gainPct.toFixed(2)),
      });

      openPositions.delete(signal.asset);
    }
  }

  // Mark-to-market any remaining open positions using last known close
  for (const [asset, pos] of openPositions.entries()) {
    const prices = pricesByAsset.get(asset) ?? [];
    const lastClose = prices.length > 0 ? prices[prices.length - 1].close : pos.buyPrice;
    const gainINR = (lastClose - pos.buyPrice) * pos.quantity;
    const gainPct = ((lastClose - pos.buyPrice) / pos.buyPrice) * 100;

    completedTrades.push({
      asset,
      buyPrice: pos.buyPrice,
      sellPrice: lastClose,
      quantity: pos.quantity,
      gainINR: parseFloat(gainINR.toFixed(2)),
      gainPct: parseFloat(gainPct.toFixed(2)),
    });
  }

  // Compute aggregate stats
  const totalGainINR = completedTrades.reduce((sum, t) => sum + t.gainINR, 0);
  const profitableTrades = completedTrades.filter(t => t.gainINR > 0);
  const totalGainPct = capitalINR > 0 ? (totalGainINR / capitalINR) * 100 : 0;

  const best = completedTrades.length > 0
    ? completedTrades.reduce((a, b) => (a.gainPct > b.gainPct ? a : b))
    : null;

  const worst = completedTrades.length > 0
    ? completedTrades.reduce((a, b) => (a.gainPct < b.gainPct ? a : b))
    : null;

  return {
    projectedGainINR: parseFloat(totalGainINR.toFixed(2)),
    projectedGainPct: parseFloat(totalGainPct.toFixed(2)),
    winRate: completedTrades.length > 0
      ? `${Math.round((profitableTrades.length / completedTrades.length) * 100)}%`
      : '0%',
    totalTrades: completedTrades.length,
    profitableTrades: profitableTrades.length,
    bestTrade: best ? { asset: best.asset, gainPct: best.gainPct } : null,
    worstTrade: worst ? { asset: worst.asset, gainPct: worst.gainPct } : null,
  };
}
