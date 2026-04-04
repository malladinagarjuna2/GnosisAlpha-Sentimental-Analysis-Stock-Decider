// src/modules/analysis/agents/agent.interfaces.ts
// Zod schemas enforce strict output contracts between agents.
// Every LLM response is validated before being passed to the next agent.
import { z } from 'zod';

// ─── Agent 1: Sentiment + Relevance ───────────────────────────────────────────

export const SentimentAgentSchema = z.object({
  asset:            z.string().default('UNKNOWN'),
  relevanceScore:   z.number().min(0).max(1).default(0.5),
  tweetType:        z.enum(['news', 'opinion', 'hype', 'fear', 'spam']).default('opinion'),
  sentimentScore:   z.number().min(-1).max(1).default(0),
  matchedKeywords:  z.array(z.string()).default([]),
  confidence:       z.number().min(0).max(1).default(0.3),
});

export type SentimentAgentResult = z.infer<typeof SentimentAgentSchema>;

export const DEFAULT_SENTIMENT_RESULT: SentimentAgentResult = {
  asset:           'UNKNOWN',
  relevanceScore:  0.3,
  tweetType:       'opinion',
  sentimentScore:  0,
  matchedKeywords: [],
  confidence:      0.2,
};

// ─── Agent 2: Risk / Sarcasm / Contradiction ──────────────────────────────────

export const RiskAgentSchema = z.object({
  sarcasmDetected:        z.boolean().default(false),
  ironyDetected:          z.boolean().default(false),
  pumpAndDumpSignals:     z.boolean().default(false),
  misleadingSignals:      z.array(z.string()).default([]),
  emotionalManipulation:  z.boolean().default(false),
  riskFlags:              z.array(z.string()).default([]),
  adjustedConfidence:     z.number().min(0).max(1).default(0.3),
  riskLevel:              z.enum(['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN']).default('MEDIUM'),
});

export type RiskAgentResult = z.infer<typeof RiskAgentSchema>;

export const DEFAULT_RISK_RESULT = (baseConfidence: number): RiskAgentResult => ({
  sarcasmDetected:       false,
  ironyDetected:         false,
  pumpAndDumpSignals:    false,
  misleadingSignals:     [],
  emotionalManipulation: false,
  riskFlags:             ['Risk analysis unavailable'],
  adjustedConfidence:    baseConfidence * 0.5,  // halve confidence — aggressive, intentional
  riskLevel:             'UNKNOWN',
});

// ─── Agent 3: Explanation ─────────────────────────────────────────────────────

export const ExplanationAgentSchema = z.object({
  summary:        z.string().default('Analysis unavailable'),
  reasoning:      z.string().default(''),
  keySignals:     z.array(z.string()).default([]),
  recommendation: z.string().default('Insufficient data for recommendation'),
});

export type ExplanationAgentResult = z.infer<typeof ExplanationAgentSchema>;

// ─── Full pipeline trace (sent to frontend for transparency) ──────────────────

export interface AgentTrace {
  agent1: SentimentAgentResult;
  agent2: RiskAgentResult;
  agent3: ExplanationAgentResult;
}

// ─── Helper: parse + validate LLM raw string output ──────────────────────────

export function validateAgentOutput<T>(
  raw: string,
  schema: z.ZodSchema<T>,
  agentName: string,
): T {
  // Extract JSON from markdown code blocks if present
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch ? jsonMatch[1] ?? jsonMatch[0] : raw;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr.trim());
  } catch {
    throw new Error(`${agentName}: JSON parse failed — raw="${raw.slice(0, 100)}"`);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `${agentName}: Schema validation failed — ${result.error.issues.map(i => i.message).join(', ')}`,
    );
  }
  return result.data;
}
