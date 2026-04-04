// src/modules/analysis/analysis.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalysisController } from './analysis.controller';
import { AnalysisService }    from './analysis.service';
import { GeminiProvider }     from './llm/gemini.provider';
import { OpenAiProvider }     from './llm/openai.provider';
import { SentimentAgent }     from './agents/sentiment.agent';
import { RiskAgent }          from './agents/risk.agent';
import { ExplanationAgent }   from './agents/explanation.agent';
import { ArmorIQClient }      from './armoriq/armoriq.client';

@Module({
  imports:     [ConfigModule],
  controllers: [AnalysisController],
  providers:   [
    // LLM providers
    GeminiProvider,
    OpenAiProvider,
    // Agents
    SentimentAgent,
    RiskAgent,
    ExplanationAgent,
    // Security
    ArmorIQClient,
    // Orchestrator
    AnalysisService,
  ],
})
export class AnalysisModule {}
