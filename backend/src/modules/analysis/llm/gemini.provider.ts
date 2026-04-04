// src/modules/analysis/llm/gemini.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LlmProvider } from './llm-provider.interface';

@Injectable()
export class GeminiProvider implements LlmProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly genAI: GoogleGenerativeAI | null;
  readonly providerName = 'Gemini (gemini-1.5-flash)';

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('GEMINI_API_KEY');
    if (key && !key.startsWith('your_')) {
      this.genAI = new GoogleGenerativeAI(key);
      this.logger.log('✅ Gemini provider ready');
    } else {
      this.genAI = null;
      this.logger.warn('⚠️  Gemini API key not set — provider unavailable');
    }
  }

  isAvailable(): boolean {
    return this.genAI !== null;
  }

  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.genAI) throw new Error('Gemini provider not configured');

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { temperature: 0.2, maxOutputTokens: 700 },
    });

    // Gemini doesn't have a system role — prepend system prompt to user content
    const result = await model.generateContent(
      `${systemPrompt}\n\n${userPrompt}`,
    );
    return result.response.text();
  }
}
