// src/modules/agents/agents.controller.ts
// GET /api/agents — shows registered agents + health status + broker info.
import { Controller, Get } from '@nestjs/common';
import { AgentOrchestratorService } from './agent-orchestrator.service';

@Controller('agents')
export class AgentsController {
  constructor(private readonly orchestrator: AgentOrchestratorService) {}

  /** GET /api/agents — list all registered agents with health status */
  @Get()
  async list() {
    const agents = await this.orchestrator.getAgentStatus();
    return {
      agents,
      total: agents.length,
      healthy: agents.filter(a => a.healthy).length,
      broker: {
        provider: 'Mock (Paper Trading)',
        isLive: false,
        note: 'Swap to Kite/Alpaca by implementing BrokerPort',
      },
    };
  }
}
