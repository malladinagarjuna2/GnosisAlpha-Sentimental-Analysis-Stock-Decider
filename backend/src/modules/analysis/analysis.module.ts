// src/modules/analysis/analysis.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AgentsModule } from '../agents/agents.module';
import { GeminiProvider } from './llm/gemini.provider';
import { OpenAiProvider } from './llm/openai.provider';
import { SentimentAgent } from './agents/sentiment.agent';
import { RiskAgent } from './agents/risk.agent';
import { ExplanationAgent } from './agents/explanation.agent';
import { ArmorIQClient } from './armoriq/armoriq.client';

@Module({
  imports: [ConfigModule, AgentsModule],
  controllers: [AnalysisController],
  providers: [
    AnalysisService,
    GeminiProvider,
    OpenAiProvider,
    SentimentAgent,
    RiskAgent,
    ExplanationAgent,
    ArmorIQClient,
  ],
})
export class AnalysisModule {}
