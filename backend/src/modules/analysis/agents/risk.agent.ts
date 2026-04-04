// src/modules/analysis/agents/risk.agent.ts
// Agent 2: Risk / Sarcasm / Contradiction — uses OpenAI (different LLM from Agent 1)
import { Injectable, Logger } from '@nestjs/common';
import { OpenAiProvider } from '../llm/openai.provider';
import {
  RiskAgentSchema,
  RiskAgentResult,
  DEFAULT_RISK_RESULT,
  SentimentAgentResult,
  validateAgentOutput,
} from './agent.interfaces';

const SYSTEM_PROMPT = `You are a financial risk detection specialist analyzing social media posts about stocks and crypto.
Your job is to detect misleading, manipulative, or low-quality signals.
Return ONLY valid JSON with no markdown, no explanation, no extra text.

Required JSON schema:
{
  "sarcasmDetected": boolean,
  "ironyDetected": boolean,
  "pumpAndDumpSignals": boolean,
  "misleadingSignals": array of strings,
  "emotionalManipulation": boolean,
  "riskFlags": array of strings,
  "adjustedConfidence": number 0-1,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH"
}`;

@Injectable()
export class RiskAgent {
  private readonly logger = new Logger(RiskAgent.name);

  constructor(private readonly openai: OpenAiProvider) {}

  async analyze(postContent: string, agent1Result: SentimentAgentResult): Promise<RiskAgentResult> {
    if (!this.openai.isAvailable()) {
      this.logger.warn('Agent 2 (OpenAI): provider unavailable — risk analysis UNAVAILABLE');
      return DEFAULT_RISK_RESULT(agent1Result.confidence);
    }

    const userPrompt = `Post: "${postContent}"

Initial sentiment:
- Asset: ${agent1Result.asset}
- Score: ${agent1Result.sentimentScore.toFixed(2)}
- Type: ${agent1Result.tweetType}
- Confidence: ${agent1Result.confidence.toFixed(2)}
- Keywords: ${agent1Result.matchedKeywords.join(', ') || 'none'}

Analyze for risk signals. Start adjustedConfidence from ${agent1Result.confidence.toFixed(2)} and reduce for each risk found. Return only JSON.`;

    try {
      const raw = await this.openai.generate(SYSTEM_PROMPT, userPrompt);
      const result = validateAgentOutput(raw, RiskAgentSchema, 'Agent 2 (OpenAI)');
      this.logger.log(
        `Agent 2 ✅ riskLevel=${result.riskLevel} confidence=${result.adjustedConfidence.toFixed(2)} flags=${result.riskFlags.length}`,
      );
      return result;
    } catch (err) {
      this.logger.warn(`Agent 2 failed: ${(err as Error).message} — halving confidence`);
      return DEFAULT_RISK_RESULT(agent1Result.confidence);
    }
  }
}