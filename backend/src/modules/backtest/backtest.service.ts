// src/modules/backtest/backtest.service.ts
// Core backtest orchestrator — uses AgentOrchestrator to run ALL registered agents
// against historical tweets + prices. Agent-agnostic: works with NLP now,
// multi-agent later, trading algo later — no code changes needed.
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AgentOrchestratorService } from '../agents/agent-orchestrator.service';
import { TwitterFetcherAdapter } from '../fetcher/twitter-fetcher.adapter';
import { StrategiesService } from '../strategies/strategies.service';
import { ProfileService } from '../profile/profile.service';
import { YahooFinanceAdapter } from './adapters/yahoo-finance.adapter';
import { MockTradeExecutor } from './adapters/mock-trade-executor.adapter';
import { simulateTrades } from './trade-simulator';
import type { PriceDataPort, OHLCV } from './ports/price-data.port';
import type { TradeExecutorPort } from './ports/trade-executor.port';
import type { BacktestRequestDto } from './dto/backtest-request.dto';
import type { BacktestResult, BacktestSignal } from './dto/backtest-result.dto';
import type { PostData } from '../agents/ports/agent.port';

@Injectable()
export class BacktestService {
  private readonly logger = new Logger(BacktestService.name);

  // Port adapters — injectable, swappable
  private readonly priceProvider: PriceDataPort;
  private readonly tradeExecutor: TradeExecutorPort;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: AgentOrchestratorService,
    private readonly twitterAdapter: TwitterFetcherAdapter,
    private readonly strategiesService: StrategiesService,
    private readonly profileService: ProfileService,
    private readonly yahooAdapter: YahooFinanceAdapter,
    private readonly mockExecutor: MockTradeExecutor,
  ) {
    this.priceProvider = this.yahooAdapter;
    this.tradeExecutor = this.mockExecutor;
  }

  async runBacktest(userId: string, dto: BacktestRequestDto): Promise<BacktestResult> {
    const lookbackDays = Math.min(dto.lookbackDays ?? 7, 7);
    const sinceHours = lookbackDays * 24;
    const fromDate = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
    const toDate = new Date();

    // 1. Resolve capital + profile
    const profile = await this.profileService.findByUser(userId);
    const capitalINR = dto.capitalAmount ?? profile?.capitalAmount ?? 100_000;

    // 2. Fetch tweets from TRUSTED channels (trustScore >= 0.7)
    const trustedChannels = await this.prisma.socialChannel.findMany({
      where: { isDefault: true, trustScore: { gte: 0.7 } },
    });

    this.logger.log(
      `🔬 Backtest: ${dto.assets.join(', ')} | ${lookbackDays}d | ₹${capitalINR} | ` +
      `${trustedChannels.length} trusted sources`,
    );

    // 3. Scrape tweets from each trusted channel
    const allPosts: PostData[] = [];

    for (const ch of trustedChannels) {
      try {
        const posts = await this.twitterAdapter.fetchByChannel(ch.handle, 100, sinceHours);
        if (posts?.length) {
          for (const p of posts) {
            allPosts.push({
              id: p.externalId ?? `tweet-${Date.now()}-${Math.random()}`,
              content: p.content,
              author: p.author,
              trustScore: ch.trustScore,
              postedAt: p.postedAt,
              retweetCount: p.retweetCount ?? 0,
              likeCount: p.likeCount ?? 0,
              authorFollowers: p.authorFollowers ?? 0,
              source: ch.handle,
            });
          }
        }
      } catch (err) {
        this.logger.warn(`⚠️  Failed to fetch @${ch.handle}: ${(err as Error).message}`);
      }
    }

    this.logger.log(`📰 Scraped ${allPosts.length} tweets from ${trustedChannels.length} channels`);

    // 4. Fetch historical prices for each requested asset
    const pricesByAsset = new Map<string, OHLCV[]>();
    for (const asset of dto.assets) {
      const prices = await this.priceProvider.getHistoricalPrices(
        asset.toUpperCase(), fromDate, toDate, '1d',
      );
      pricesByAsset.set(asset.toUpperCase(), prices);
    }

    // 5. Run ALL registered agents via the orchestrator
    const agentResult = await this.orchestrator.runAll({
      assets: dto.assets,
      posts: allPosts,
      priceData: pricesByAsset,
      profile: profile ? {
        riskTolerance: profile.riskTolerance,
        horizon: profile.horizon,
        capitalAmount: profile.capitalAmount,
      } : null,
    });

    this.logger.log(
      `🤖 Agents produced ${agentResult.signals.length} signals ` +
      `(agents used: ${agentResult.agentsUsed.join(', ')})`,
    );

    // 6. Convert agent signals → backtest signals with price data
    const backtestSignals: BacktestSignal[] = agentResult.signals
      .filter(s => s.action !== 'HOLD')
      .map(s => ({
        date: s.timestamp.toISOString(),
        asset: s.asset,
        action: s.action as 'BUY' | 'SELL',
        sentimentScore: s.score,
        trigger: s.metadata?.trigger ?? s.reasoning.slice(0, 120),
        source: s.metadata?.source ?? s.agentName,
        trustScore: s.metadata?.trustScore ?? s.confidence,
        priceAtSignal: this.findClosestPrice(
          pricesByAsset.get(s.asset) ?? [], s.timestamp,
        ),
      }))
      .filter(s => s.priceAtSignal > 0);

    // 7. Simulate trades
    const performance = simulateTrades({
      signals: backtestSignals,
      pricesByAsset,
      capitalINR,
    });

    // 8. Generate recommendation
    const riskLabel = profile?.riskTolerance
      ? `${profile.riskTolerance}/10`
      : 'default';

    const recommendation = this.generateRecommendation(
      performance, capitalINR, dto.assets, riskLabel, lookbackDays,
      agentResult.agentsUsed,
    );

    return {
      strategyName: 'Multi-Agent Backtest',
      period: {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0],
      },
      assets: dto.assets.map(a => a.toUpperCase()),
      capitalINR,
      totalTweetsAnalyzed: allPosts.length,
      trustedSourcesUsed: [...new Set(backtestSignals.map(s => s.source))],
      signals: backtestSignals,
      performance,
      recommendation,
      priceDataProvider: this.priceProvider.providerName,
      tradeExecutor: this.tradeExecutor.providerName,
    };
  }

  private findClosestPrice(prices: OHLCV[], signalDate: Date): number {
    if (prices.length === 0) return 0;
    let closest = prices[0];
    let minDiff = Math.abs(signalDate.getTime() - prices[0].date.getTime());
    for (const p of prices) {
      const diff = Math.abs(signalDate.getTime() - p.date.getTime());
      if (diff < minDiff) { minDiff = diff; closest = p; }
    }
    return closest.close;
  }

  private generateRecommendation(
    performance: any, capitalINR: number, assets: string[],
    riskLabel: string, lookbackDays: number, agentsUsed: string[],
  ): string {
    const gainStr = performance.projectedGainINR >= 0
      ? `gained ₹${performance.projectedGainINR.toLocaleString('en-IN')}`
      : `lost ₹${Math.abs(performance.projectedGainINR).toLocaleString('en-IN')}`;
    const assetStr = assets.join(', ');

    if (performance.totalTrades === 0) {
      return `No actionable signals were generated for ${assetStr} in the last ${lookbackDays} days. ` +
        `Agents used: ${agentsUsed.join(', ')}. Try adjusting thresholds or adding more assets.`;
    }

    return (
      `Based on your risk tolerance (${riskLabel}) and ₹${capitalINR.toLocaleString('en-IN')} capital, ` +
      `our agents would have ${gainStr} (${performance.projectedGainPct}%) over the last ${lookbackDays} days ` +
      `trading ${assetStr}. Win rate: ${performance.winRate} across ${performance.totalTrades} trades. ` +
      `Agents used: ${agentsUsed.join(', ')}.`
    );
  }
}
