'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { strategiesAPI } from '@/lib/api';
import { toast } from 'sonner';
import type { GeneratedStrategy } from '@/lib/types';
import {
  Sparkles,
  Shield,
  Scale,
  Flame,
  Zap,
  Bot,
  TrendingUp,
  X,
  CheckCircle2,
} from 'lucide-react';

const NSE_STOCKS = [
  'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK',
  'SBIN', 'WIPRO', 'TATAMOTORS', 'BAJFINANCE', 'LT',
];

const RISK_ICONS: Record<string, React.ElementType> = {
  LOW:    Shield,
  MEDIUM: Scale,
  HIGH:   Flame,
};

const RISK_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  LOW:    { text: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  MEDIUM: { text: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
  HIGH:   { text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
};

export default function StrategiesPage() {
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [strategies, setStrategies] = useState<GeneratedStrategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);

  const toggleAsset = (sym: string) => {
    setSelectedAssets(prev =>
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  };

  const generate = async () => {
    if (selectedAssets.length === 0) {
      toast.error('Select at least one stock');
      return;
    }

    setLoading(true);
    setStrategies([]);
    setAppliedIndex(null);

    try {
      const res = await strategiesAPI.generate(selectedAssets);

      // Defensive: res.data should be GeneratedStrategy[] directly from the API
      const data = Array.isArray(res.data) ? res.data : [];

      if (data.length === 0) {
        toast.error('No strategies were returned. Check your investor profile and try again.');
        return;
      }

      setStrategies(data);
      toast.success(`${data.length} strategies generated!`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Generation failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const applyStrategy = async (strat: GeneratedStrategy, index: number) => {
    try {
      await strategiesAPI.update(strat.config);
      setAppliedIndex(index);
      toast.success(`"${strat.name}" applied as your active strategy!`);
    } catch (err: any) {
      toast.error('Failed to apply strategy. Please try again.');
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-violet-500/10 animate-pulse-glow">
          <Sparkles className="h-7 w-7 text-violet-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold gradient-text">AI Strategy Generator</h1>
          <p className="text-muted-foreground text-sm">
            GPT-4o-mini creates personalized strategies based on your profile &amp; market sentiment
          </p>
        </div>
      </div>

      {/* Asset Picker */}
      <Card className="p-6 border-border/20 bg-card/50 backdrop-blur-sm">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-accent" />
          Select Stocks for Strategy
        </h2>

        <div className="flex flex-wrap gap-2 mb-4">
          {NSE_STOCKS.map(sym => (
            <button
              key={sym}
              onClick={() => toggleAsset(sym)}
              className={`px-3 py-1.5 rounded-lg text-sm font-code font-medium transition-all duration-200 ${
                selectedAssets.includes(sym)
                  ? 'bg-violet-500 text-white shadow-sm scale-105'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>

        {selectedAssets.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedAssets.map(sym => (
              <Badge key={sym} variant="outline" className="gap-1 font-code">
                {sym}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => toggleAsset(sym)}
                />
              </Badge>
            ))}
          </div>
        )}

        <Button
          onClick={generate}
          disabled={loading || selectedAssets.length === 0}
          className="gap-2"
          size="lg"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Generating with AI...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Generate 3 Strategies
            </>
          )}
        </Button>
      </Card>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      )}

      {/* Strategy Cards — render as soon as strategies is non-empty */}
      {!loading && strategies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {strategies.map((strat, i) => {
            const RiskIcon = RISK_ICONS[strat.riskLevel] ?? Scale;
            const colors = RISK_COLORS[strat.riskLevel] ?? RISK_COLORS.MEDIUM;
            const isApplied = appliedIndex === i;

            return (
              <Card
                key={i}
                className={`p-6 border-2 ${colors.border} bg-card/50 backdrop-blur-sm flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-lg`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${colors.bg}`}>
                    <RiskIcon className={`h-6 w-6 ${colors.text}`} />
                  </div>
                  <Badge variant="outline" className="font-code text-xs">
                    Win: {strat.estimatedWinRate}
                  </Badge>
                </div>

                {/* Name & description */}
                <h3 className="text-lg font-bold mb-1">{strat.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 flex-1 leading-relaxed">
                  {strat.description}
                </p>

                {/* Risk badge */}
                <div className="mb-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
                    {strat.riskLevel} RISK
                  </span>
                </div>

                {/* Rationale */}
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  {strat.rationale}
                </p>

                {/* Config preview */}
                <div className="mt-auto pt-4 border-t border-border/10 space-y-1.5 font-code text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Sentiment Threshold</span>
                    <span className="text-foreground">{strat.config?.sentimentThreshold ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Impact Threshold</span>
                    <span className="text-foreground">{strat.config?.impactThreshold ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confidence</span>
                    <span className="text-foreground">{strat.config?.confidenceThreshold ?? '—'}</span>
                  </div>
                </div>

                {/* Agents */}
                {strat.agentsUsed?.length > 0 && (
                  <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <Bot className="h-3 w-3 shrink-0" />
                    <span className="truncate">{strat.agentsUsed.join(', ')}</span>
                  </div>
                )}

                {/* Apply button */}
                <Button
                  variant={isApplied ? 'default' : 'outline'}
                  className="mt-4 w-full gap-2"
                  size="sm"
                  onClick={() => applyStrategy(strat, i)}
                  disabled={isApplied}
                >
                  {isApplied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Applied
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Apply Strategy
                    </>
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty state after loading (no strategies returned) */}
      {!loading && strategies.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Select stocks above and click <strong>Generate 3 Strategies</strong> to get started.
        </div>
      )}
    </div>
  );
}
