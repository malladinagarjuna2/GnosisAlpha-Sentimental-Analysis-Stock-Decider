'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { backtestAPI } from '@/lib/api';
import { toast } from 'sonner';
import type { BacktestResult, BacktestSignal } from '@/lib/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import {
  FlaskConical,
  Play,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  BarChart3,
  Clock,
  Shield,
  X,
  LineChart as LineChartIcon,
} from 'lucide-react';

const NSE_STOCKS = [
  'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK',
  'SBIN', 'WIPRO', 'TATAMOTORS', 'BAJFINANCE', 'LT',
];

// One distinct colour per stock line
const ASSET_COLORS = [
  '#34d399', // emerald
  '#60a5fa', // blue
  '#f59e0b', // amber
  '#a78bfa', // violet
  '#f87171', // red
  '#38bdf8', // sky
  '#fb923c', // orange
  '#4ade80', // green
  '#e879f9', // fuchsia
  '#facc15', // yellow
];

/**
 * Build Recharts-compatible time-series data from backtest signals.
 * Each row = { date, RELIANCE: price, TCS: price, ... }
 * Sorted chronologically.
 */
function buildChartData(signals: BacktestSignal[]) {
  const dateMap = new Map<string, Record<string, number>>();

  const sorted = [...signals].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const sig of sorted) {
    // Use ISO date part so same-day signals collapse to one point
    const day = sig.date.slice(0, 10);
    if (!dateMap.has(day)) dateMap.set(day, { date: day });
    const row = dateMap.get(day)!;
    // If multiple signals on same day for same asset, take the last price
    row[sig.asset] = sig.priceAtSignal;
  }

  return Array.from(dateMap.values());
}

// Custom tooltip showing all assets' prices + action badges
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/30 bg-card/90 backdrop-blur-sm p-3 shadow-xl text-xs">
      <p className="font-code font-bold mb-2 text-muted-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <span style={{ color: p.color }} className="font-semibold">
            {p.dataKey}
          </span>
          <span className="font-code text-foreground">
            ₹{Number(p.value).toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function BacktestPage() {
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [customAsset, setCustomAsset] = useState('');
  const [capital, setCapital] = useState('100000');
  const [lookbackDays, setLookbackDays] = useState(7);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleAsset = (symbol: string) => {
    setSelectedAssets(prev =>
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  };

  const addCustom = () => {
    const sym = customAsset.trim().toUpperCase();
    if (sym && !selectedAssets.includes(sym)) {
      setSelectedAssets(prev => [...prev, sym]);
      setCustomAsset('');
    }
  };

  const runBacktest = async () => {
    if (selectedAssets.length === 0) {
      toast.error('Select at least one stock');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await backtestAPI.run({
        assets: selectedAssets,
        lookbackDays,
        capitalAmount: parseFloat(capital) || 100000,
      });
      setResult(res.data);
      toast.success('Backtest complete!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Backtest failed');
    }
    setLoading(false);
  };

  const isProfit = result ? result.performance.projectedGainINR >= 0 : false;

  // Derived chart data (only computed when result exists)
  const chartData = result?.signals.length ? buildChartData(result.signals) : [];
  const chartAssets = result
    ? [...new Set(result.signals.map(s => s.asset))]
    : [];
  // Dates where BUY/SELL happened (for reference lines)
  const buyDates = result?.signals.filter(s => s.action === 'BUY').map(s => s.date.slice(0, 10)) ?? [];
  const sellDates = result?.signals.filter(s => s.action === 'SELL').map(s => s.date.slice(0, 10)) ?? [];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-emerald-500/10 animate-pulse-glow">
          <FlaskConical className="h-7 w-7 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold gradient-text">Backtest Engine</h1>
          <p className="text-muted-foreground text-sm">
            See what you&apos;d have gained if you used our AI agents over the last week
          </p>
        </div>
      </div>

      {/* Config Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset Selection */}
        <Card className="lg:col-span-2 p-6 border-border/20 bg-card/50 backdrop-blur-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            Select NSE Stocks
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {NSE_STOCKS.map(sym => (
              <button
                key={sym}
                onClick={() => toggleAsset(sym)}
                className={`px-3 py-1.5 rounded-lg text-sm font-code font-medium transition-all duration-200 ${
                  selectedAssets.includes(sym)
                    ? 'bg-accent text-accent-foreground shadow-sm scale-105'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:scale-102'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>

          {selectedAssets.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-accent/5 border border-accent/10">
              {selectedAssets.map(sym => (
                <Badge key={sym} variant="outline" className="gap-1 font-code">
                  {sym}
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => toggleAsset(sym)} />
                </Badge>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Custom symbol (e.g. ADANI)"
              value={customAsset}
              onChange={e => setCustomAsset(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && addCustom()}
              className="font-code"
            />
            <Button variant="outline" onClick={addCustom}>Add</Button>
          </div>
        </Card>

        {/* Parameters */}
        <Card className="p-6 border-border/20 bg-card/50 backdrop-blur-sm space-y-5">
          <div>
            <label className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4" /> Lookback Period
            </label>
            <div className="flex gap-2">
              {[3, 5, 7].map(d => (
                <button
                  key={d}
                  onClick={() => setLookbackDays(d)}
                  className={`flex-1 py-2 rounded-lg text-sm font-code font-bold transition-all ${
                    lookbackDays === d
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted/40 hover:bg-muted/60'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4" /> Capital (₹)
            </label>
            <Input
              type="number"
              value={capital}
              onChange={e => setCapital(e.target.value)}
              className="font-code"
            />
          </div>

          <Button
            onClick={runBacktest}
            disabled={loading || selectedAssets.length === 0}
            className="w-full py-5 text-base font-semibold gap-2"
            size="lg"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Running Agents...
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Run Backtest
              </>
            )}
          </Button>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <div className="animate-shimmer rounded-xl h-40" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-slide-up">

          {/* P&L Hero Card */}
          <Card className={`p-8 border-2 ${
            isProfit ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
          } backdrop-blur-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Projected P&L ({result.period.from} → {result.period.to})
                </p>
                <div className="flex items-baseline gap-3">
                  <span className={`text-5xl font-bold font-code animate-count-up ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isProfit ? '+' : ''}₹{result.performance.projectedGainINR.toLocaleString('en-IN')}
                  </span>
                  <span className={`text-xl font-code ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                    ({isProfit ? '+' : ''}{result.performance.projectedGainPct}%)
                  </span>
                </div>
              </div>
              <div className={`p-4 rounded-2xl ${isProfit ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                {isProfit
                  ? <ArrowUpRight className="h-10 w-10 text-emerald-400" />
                  : <ArrowDownRight className="h-10 w-10 text-red-400" />}
              </div>
            </div>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
            <Card className="p-4 border-border/20 bg-card/50 backdrop-blur-sm">
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold font-code text-foreground">{result.performance.winRate}</p>
            </Card>
            <Card className="p-4 border-border/20 bg-card/50 backdrop-blur-sm">
              <p className="text-xs text-muted-foreground">Total Trades</p>
              <p className="text-2xl font-bold font-code text-foreground">{result.performance.totalTrades}</p>
            </Card>
            <Card className="p-4 border-border/20 bg-card/50 backdrop-blur-sm">
              <p className="text-xs text-muted-foreground">Tweets Analyzed</p>
              <p className="text-2xl font-bold font-code text-foreground">{result.totalTweetsAnalyzed}</p>
            </Card>
            <Card className="p-4 border-border/20 bg-card/50 backdrop-blur-sm">
              <p className="text-xs text-muted-foreground">Capital</p>
              <p className="text-2xl font-bold font-code text-foreground">₹{result.capitalINR.toLocaleString('en-IN')}</p>
            </Card>
          </div>

          {/* ── Price Time-Series Chart ── */}
          {chartData.length > 1 && (
            <Card className="p-6 border-border/20 bg-card/50 backdrop-blur-sm">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <LineChartIcon className="h-4 w-4 text-accent" />
                Stock Price at Signal Points
                <span className="ml-auto text-xs text-muted-foreground font-code">
                  {result.period.from} → {result.period.to}
                </span>
              </h3>

              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`}
                    width={80}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    formatter={(val) => (
                      <span style={{ fontSize: 12, color: 'hsl(var(--foreground))' }}>{val}</span>
                    )}
                  />

                  {/* BUY reference lines (green dashed) */}
                  {[...new Set(buyDates)].map(d => (
                    <ReferenceLine
                      key={`buy-${d}`}
                      x={d}
                      stroke="#34d399"
                      strokeDasharray="4 2"
                      strokeOpacity={0.5}
                      label={{ value: 'B', fill: '#34d399', fontSize: 10 }}
                    />
                  ))}

                  {/* SELL reference lines (red dashed) */}
                  {[...new Set(sellDates)].map(d => (
                    <ReferenceLine
                      key={`sell-${d}`}
                      x={d}
                      stroke="#f87171"
                      strokeDasharray="4 2"
                      strokeOpacity={0.5}
                      label={{ value: 'S', fill: '#f87171', fontSize: 10 }}
                    />
                  ))}

                  {chartAssets.map((asset, i) => (
                    <Line
                      key={asset}
                      type="monotone"
                      dataKey={asset}
                      stroke={ASSET_COLORS[i % ASSET_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>

              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground font-code">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 border-t-2 border-dashed border-emerald-400" />
                  BUY signal
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 border-t-2 border-dashed border-red-400" />
                  SELL signal
                </span>
              </div>
            </Card>
          )}

          {/* Recommendation */}
          <Card className="p-6 border-border/20 bg-card/50 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold mb-1">AI Recommendation</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{result.recommendation}</p>
              </div>
            </div>
          </Card>

          {/* Best / Worst Trade */}
          {(result.performance.bestTrade || result.performance.worstTrade) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.performance.bestTrade && (
                <Card className="p-4 border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm">
                  <p className="text-xs text-muted-foreground mb-1">Best Trade</p>
                  <p className="text-lg font-bold font-code text-emerald-400">
                    {result.performance.bestTrade.asset} +{result.performance.bestTrade.gainPct.toFixed(2)}%
                  </p>
                </Card>
              )}
              {result.performance.worstTrade && (
                <Card className="p-4 border-red-500/20 bg-red-500/5 backdrop-blur-sm">
                  <p className="text-xs text-muted-foreground mb-1">Worst Trade</p>
                  <p className="text-lg font-bold font-code text-red-400">
                    {result.performance.worstTrade.asset} {result.performance.worstTrade.gainPct.toFixed(2)}%
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* Signals Table */}
          {result.signals.length > 0 && (
            <Card className="border-border/20 bg-card/50 backdrop-blur-sm overflow-hidden">
              <div className="p-4 border-b border-border/20">
                <h3 className="font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-accent" />
                  Trade Signals ({result.signals.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/20 text-muted-foreground">
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Asset</th>
                      <th className="text-left p-3 font-medium">Action</th>
                      <th className="text-right p-3 font-medium">Price</th>
                      <th className="text-right p-3 font-medium">Score</th>
                      <th className="text-left p-3 font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.signals.slice(0, 20).map((sig, i) => (
                      <tr key={i} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-code text-xs" suppressHydrationWarning>
                          {new Date(sig.date).toLocaleDateString()}
                        </td>
                        <td className="p-3 font-code font-bold">{sig.asset}</td>
                        <td className="p-3">
                          <Badge variant={sig.action === 'BUY' ? 'default' : 'destructive'} className="text-xs">
                            {sig.action === 'BUY'
                              ? <TrendingUp className="h-3 w-3 mr-1" />
                              : <TrendingDown className="h-3 w-3 mr-1" />}
                            {sig.action}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-code">₹{sig.priceAtSignal.toFixed(2)}</td>
                        <td className="p-3 text-right font-code">
                          <span className={sig.sentimentScore > 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {sig.sentimentScore > 0 ? '+' : ''}{sig.sentimentScore.toFixed(3)}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">@{sig.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Meta Info */}
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground font-code">
            <span>Price: {result.priceDataProvider}</span>
            <span>•</span>
            <span>Executor: {result.tradeExecutor}</span>
            <span>•</span>
            <span>Sources: {result.trustedSourcesUsed.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
