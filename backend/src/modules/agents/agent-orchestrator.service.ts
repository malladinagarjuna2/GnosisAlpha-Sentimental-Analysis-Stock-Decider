// src/modules/agents/agent-orchestrator.service.ts
// Central orchestrator — registers agents, runs them, aggregates signals.
// BacktestService and StrategyGenerator talk to this, NOT directly to NLP/LLM.
// Adding a new agent = implement AgentPort + register here. Nothing else changes.
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { AgentPort, AgentContext, AgentSignal } from './ports/agent.port';
import { NlpSentimentAgent } from './adapters/nlp-sentiment.agent';

export interface AgentStatus {
  name: string;
  type: string;
  version: string;
  healthy: boolean;
}

export interface AggregatedResult {
  signals: AgentSignal[];
  agentsUsed: string[];
  totalPostsAnalyzed: number;
  signalsByAsset: Map<string, AgentSignal[]>;
}

@Injectable()
export class AgentOrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(AgentOrchestratorService.name);
  private readonly agents: AgentPort[] = [];

  constructor(
    private readonly nlpAgent: NlpSentimentAgent,
    // Future: inject DeepAnalysisAgent, ExternalMultiAgent, TradingAlgoAgent
  ) {}

  onModuleInit() {
    // Register all available agents
    this.register(this.nlpAgent);

    // Future: uncomment as agents are implemented
    // this.register(this.deepAnalysisAgent);
    // this.register(this.externalMultiAgent);
    // this.register(this.tradingAlgoAgent);

    this.logger.log(`🤖 Agent Orchestrator initialized with ${this.agents.length} agent(s)`);
  }

  /** Register an agent */
  register(agent: AgentPort): void {
    this.agents.push(agent);
    this.logger.log(`  ↳ Registered: ${agent.name} (${agent.type} v${agent.version})`);
  }

  /** Get status of all registered agents */
  async getAgentStatus(): Promise<AgentStatus[]> {
    const statuses: AgentStatus[] = [];
    for (const agent of this.agents) {
      const healthy = await agent.isHealthy().catch(() => false);
      statuses.push({
        name: agent.name,
        type: agent.type,
        version: agent.version,
        healthy,
      });
    }
    return statuses;
  }

  /** Run ALL healthy agents against the given context and aggregate signals */
  async runAll(context: AgentContext): Promise<AggregatedResult> {
    const allSignals: AgentSignal[] = [];
    const agentsUsed: string[] = [];

    for (const agent of this.agents) {
      const healthy = await agent.isHealthy().catch(() => false);
      if (!healthy) {
        this.logger.warn(`⚠️  Skipping unhealthy agent: ${agent.name}`);
        continue;
      }

      try {
        const signals = await agent.analyze(context);
        allSignals.push(...signals);
        agentsUsed.push(agent.name);
        this.logger.log(`✅ ${agent.name}: ${signals.length} signals`);
      } catch (err) {
        this.logger.error(`❌ ${agent.name} failed: ${(err as Error).message}`);
      }
    }

    // Group signals by asset
    const signalsByAsset = new Map<string, AgentSignal[]>();
    for (const signal of allSignals) {
      const existing = signalsByAsset.get(signal.asset) ?? [];
      existing.push(signal);
      signalsByAsset.set(signal.asset, existing);
    }

    return {
      signals: allSignals,
      agentsUsed,
      totalPostsAnalyzed: context.posts.length,
      signalsByAsset,
    };
  }

  /** Get list of registered agent names */
  getRegisteredAgents(): AgentPort[] {
    return [...this.agents];
  }
}
