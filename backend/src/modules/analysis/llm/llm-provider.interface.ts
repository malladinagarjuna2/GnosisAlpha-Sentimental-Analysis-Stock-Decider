// src/modules/analysis/llm/llm-provider.interface.ts
// Platform-agnostic interface every LLM provider must implement.
export interface LlmProvider {
  /** Send a prompt and receive a raw text response */
  generate(systemPrompt: string, userPrompt: string): Promise<string>;
  /** Human-readable provider name for logging */
  readonly providerName: string;
  /** Whether this provider has valid credentials */
  isAvailable(): boolean;
}