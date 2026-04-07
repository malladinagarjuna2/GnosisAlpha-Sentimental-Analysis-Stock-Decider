// src/modules/analysis/llm/openai.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { LlmProvider } from './llm-provider.interface';

@Injectable()
export class OpenAiProvider implements LlmProvider {
  private readonly logger = new Logger(OpenAiProvider.name);
  private readonly client: OpenAI | null;
  readonly providerName = 'OpenAI (gpt-4o-mini)';

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('OPENAI_API_KEY');
    if (key && !key.startsWith('your_')) {
      this.client = new OpenAI({ apiKey: key });
      this.logger.log('✅ OpenAI provider ready');
    } else {
      this.client = null;
      this.logger.warn('⚠️  OpenAI API key not set — provider unavailable');
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.client) throw new Error('OpenAI provider not configured');

    const res = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
    });

    return res.choices[0]?.message?.content ?? '{}';
  }
}