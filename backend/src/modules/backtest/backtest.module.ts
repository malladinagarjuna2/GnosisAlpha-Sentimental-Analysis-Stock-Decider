// src/modules/backtest/backtest.module.ts
// Backtest engine — uses AgentOrchestrator for analysis + port/adapter for prices/trades.
// Agent-agnostic: adding NLP/LLM/multi-agent/algo just works via AgentsModule.
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BacktestService } from './backtest.service';
import { BacktestController } from './backtest.controller';
import { YahooFinanceAdapter } from './adapters/yahoo-finance.adapter';
import { MockTradeExecutor } from './adapters/mock-trade-executor.adapter';
import { AgentsModule } from '../agents/agents.module';
import { FetcherModule } from '../fetcher/fetcher.module';
import { StrategiesModule } from '../strategies/strategies.module';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [
    ConfigModule,
    AgentsModule,        // provides AgentOrchestratorService (runs ALL agents)
    FetcherModule,       // provides TwitterFetcherAdapter
    StrategiesModule,    // provides StrategiesService
    ProfileModule,       // provides ProfileService
  ],
  providers: [
    BacktestService,
    YahooFinanceAdapter,   // PriceDataPort — swap for KiteAdapter later
    MockTradeExecutor,     // TradeExecutorPort — swap for KiteTradeExecutor later
  ],
  controllers: [BacktestController],
  exports: [BacktestService],
})
export class BacktestModule {}
