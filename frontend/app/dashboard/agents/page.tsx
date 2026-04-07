'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFetch } from '@/hooks/useFetch';
import { agentsAPI } from '@/lib/api';
import {
  Bot,
  Cpu,
  Activity,
  CheckCircle2,
  XCircle,
  Server,
  Plug,
} from 'lucide-react';

const TYPE_ICONS: Record<string, any> = {
  SENTIMENT: Activity,
  ANALYSIS: Cpu,
  TRADING_ALGO: Bot,
};

const TYPE_COLORS: Record<string, string> = {
  SENTIMENT: 'text-emerald-400 bg-emerald-500/10',
  ANALYSIS: 'text-violet-400 bg-violet-500/10',
  TRADING_ALGO: 'text-amber-400 bg-amber-500/10',
};

export default function AgentsPage() {
  const { data: agentsData, loading } = useFetch(() => agentsAPI.list());

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-cyan-500/10 animate-pulse-glow">
          <Bot className="h-7 w-7 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold gradient-text">Agent Registry</h1>
          <p className="text-muted-foreground text-sm">
            All registered AI agents and their operational status
          </p>
        </div>
      </div>

      {/* Status Banner */}
      {!loading && agentsData && (
        <Card className="p-4 border-border/20 bg-card/50 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-medium">
                {agentsData.healthy}/{agentsData.total} agents healthy
              </span>
            </div>
            <div className="text-sm text-muted-foreground font-code">
              <Server className="h-4 w-4 inline mr-1" />
              {agentsData.broker.provider}
              {agentsData.broker.isLive && (
                <Badge variant="destructive" className="ml-2 text-[10px]">LIVE</Badge>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Agent Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : agentsData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {agentsData.agents.map((agent, i) => {
            const TypeIcon = TYPE_ICONS[agent.type] || Bot;
            const typeColor = TYPE_COLORS[agent.type] || TYPE_COLORS.SENTIMENT;

            return (
              <Card
                key={i}
                className={`p-6 border-border/20 bg-card/50 backdrop-blur-sm card-hover ${
                  agent.healthy ? '' : 'opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${typeColor}`}>
                    <TypeIcon className="h-6 w-6" />
                  </div>
                  {agent.healthy ? (
                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      Online
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-400 text-xs font-medium">
                      <XCircle className="h-4 w-4" />
                      Offline
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-bold mb-1">{agent.name}</h3>

                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className="font-code text-xs">
                    {agent.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-code">
                    v{agent.version}
                  </span>
                </div>
              </Card>
            );
          })}

          {/* Placeholder for future agents */}
          <Card className="p-6 border-2 border-dashed border-border/20 bg-card/20 flex flex-col items-center justify-center text-center gap-3 opacity-50">
            <Plug className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Add More Agents</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Implement AgentPort interface
              </p>
            </div>
          </Card>
        </div>
      ) : null}

      {/* Broker Info */}
      {!loading && agentsData && (
        <Card className="p-6 border-border/20 bg-card/50 backdrop-blur-sm">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Server className="h-5 w-5 text-accent" />
            Broker / Trade Executor
          </h3>
          <div className="space-y-2 font-code text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Provider</span>
              <span>{agentsData.broker.provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mode</span>
              <Badge variant={agentsData.broker.isLive ? 'destructive' : 'outline'}>
                {agentsData.broker.isLive ? 'LIVE TRADING' : 'Paper Trading'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground/60 pt-2 border-t border-border/10">
              {agentsData.broker.note}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
