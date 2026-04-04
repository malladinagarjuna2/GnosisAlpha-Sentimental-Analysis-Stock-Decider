// src/modules/agents/agents.module.ts
// Multi-agent module — registers all agent adapters + orchestrator.
// To add a new agent:
//   1. Create adapter in adapters/ implementing AgentPort
//   2. Add to providers[] below
//   3. Inject into AgentOrchestratorService constructor
//   4. Call this.register() in onModuleInit
//   That's it. Backtest, strategy generator, etc all pick it up automatically.
import { Module } from '@nestjs/common';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { AgentsController } from './agents.controller';
import { NlpSentimentAgent } from './adapters/nlp-sentiment.agent';
import { SentimentModule } from '../sentiment/sentiment.module';

@Module({
  imports: [
    SentimentModule,  // provides SentimentService for NlpSentimentAgent
    // Future: AnalysisModule, ExternalMultiAgentModule, TradingAlgoModule
  ],
  providers: [
    NlpSentimentAgent,
    // Future: DeepAnalysisAgent, ExternalMultiAgent, TradingAlgoAgent
    AgentOrchestratorService,
  ],
  controllers: [AgentsController],
  exports: [AgentOrchestratorService, NlpSentimentAgent],
})
export class AgentsModule {}
