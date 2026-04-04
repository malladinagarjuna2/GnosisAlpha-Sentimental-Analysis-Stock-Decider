// src/modules/backtest/adapters/mock-trade-executor.adapter.ts
// MockTradeExecutor — simulates trade execution for backtesting & demo.
// Replace with KiteTradeExecutor for live trading later.
import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import type { TradeExecutorPort, TradeOrder, TradeResult } from '../ports/trade-executor.port';

@Injectable()
export class MockTradeExecutor implements TradeExecutorPort {
  private readonly logger = new Logger(MockTradeExecutor.name);
  readonly providerName = 'Mock (Paper Trading)';
  readonly isLive = false;

  async execute(order: TradeOrder): Promise<TradeResult> {
    // Simulate a small slippage (0.1–0.3%)
    const slippage = 1 + (Math.random() * 0.003 - 0.001);
    const executedPrice = parseFloat((order.priceAtSignal * slippage).toFixed(2));

    this.logger.log(
      `📝 [SIMULATED] ${order.action} ${order.quantity}x ${order.symbol} @ ₹${executedPrice}`,
    );

    return {
      orderId: `mock-${uuid().slice(0, 8)}`,
      symbol: order.symbol,
      action: order.action,
      quantity: order.quantity,
      executedPrice,
      timestamp: order.timestamp,
      status: 'SIMULATED',
    };
  }
}
