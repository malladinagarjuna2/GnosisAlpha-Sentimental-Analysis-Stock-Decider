// src/modules/agents/ports/agent.port.ts
// Core agent abstraction — every analysis engine implements this.
// NLP, Deep Analysis, Multi-Agent, Trading Algo all speak the same language.

import type { OHLCV } from '../../backtest/ports/price-data.port';

// ─── Agent Types ──────────────────────────────────────────────────────────────

export type AgentType = 'SENTIMENT' | 'ANALYSIS' | 'TRADING_ALGO';

// ─── Agent Context (input to every agent) ─────────────────────────────────────

export interface PostData {
  id: string;
  content: string;
  author: string;
  authorFollowers: number;
  retweetCount: number;
  likeCount: number;
  postedAt: Date;
  source: string;        // channel handle
  trustScore: number;     // 0-1
}

export interface AgentContext {
  assets: string[];                     // stocks being analyzed
  posts: PostData[];                    // social/news posts
  priceData: Map<string, OHLCV[]>;     // historical prices per asset
  profile: {                            // investor profile (nullable fields)
    riskTolerance: number;
    horizon: string;
    capitalAmount: number;
  } | null;
}

// ─── Agent Signal (output from every agent) ───────────────────────────────────

export interface AgentSignal {
  agentName: string;
  agentType: AgentType;
  asset: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;       // 0-1
  score: number;            // raw score from the agent (-1 to 1)
  reasoning: string;
  timestamp: Date;
  metadata?: Record<string, any>;  // agent-specific extra data
}

// ─── Agent Port (interface every agent implements) ────────────────────────────

export interface AgentPort {
  /** Unique name of this agent */
  readonly name: string;

  /** Type classification */
  readonly type: AgentType;

  /** Semver version */
  readonly version: string;

  /**
   * Run analysis and return signals.
   * The orchestrator calls this — the agent doesn't need to know
   * about other agents, strategies, or brokers.
   */
  analyze(context: AgentContext): Promise<AgentSignal[]>;

  /** Is this agent operational right now? */
  isHealthy(): Promise<boolean>;
}
