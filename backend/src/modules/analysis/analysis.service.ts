// src/modules/analysis/analysis.service.ts
// STEP 10: On-demand LLM deep analysis — never runs automatically.
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import OpenAI from 'openai';

export interface DeepAnalysisResult {
  postId: string;
  summary: string;
  sentiment: string;
  reasoning: string;
  keyThemes: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: string;
  analyzedAt: string;
}

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private readonly openai: OpenAI | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (apiKey && apiKey !== 'your_openai_api_key') {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('🤖 OpenAI client initialized');
    } else {
      this.openai = null;
      this.logger.warn('⚠️  OpenAI API key not configured — LLM analysis will return mock results');
    }
  }

  async deepAnalyze(postId: string): Promise<DeepAnalysisResult> {
    // 1. Fetch post from DB
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException(`Post [${postId}] not found`);

    // 2. Fetch existing NLP result if available (for context)
    const nlpResult = await this.prisma.sentimentResult.findUnique({ where: { postId } });

    this.logger.log(`🔍 Deep analysis requested for post [${postId}]`);

    if (!this.openai) {
      return this.mockAnalysis(postId, post.content);
    }

    // 3. Build prompt
    const prompt = this.buildPrompt(post.content, nlpResult);

    // 4. Call OpenAI
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a financial sentiment analyst. Analyze social media posts about stocks and crypto. ' +
            'Respond ONLY with valid JSON matching the requested schema.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 600,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    this.logger.log(`✅ LLM analysis complete for post [${postId}]`);

    return this.parseResponse(postId, raw);
  }

  private buildPrompt(content: string, nlpResult: any): string {
    const nlpContext = nlpResult
      ? `\nExisting NLP analysis: score=${nlpResult.sentimentScore?.toFixed(2)}, ` +
        `impact=${nlpResult.impactScore}, category=${nlpResult.category}`
      : '';

    return (
      `Analyze this financial social media post:${nlpContext}\n\n` +
      `Post: "${content}"\n\n` +
      `Respond with JSON:\n` +
      `{\n` +
      `  "summary": "1-2 sentence summary",\n` +
      `  "sentiment": "BULLISH|BEARISH|NEUTRAL",\n` +
      `  "reasoning": "why this sentiment",\n` +
      `  "keyThemes": ["theme1", "theme2"],\n` +
      `  "riskLevel": "LOW|MEDIUM|HIGH",\n` +
      `  "recommendation": "brief action recommendation"\n` +
      `}`
    );
  }

  private parseResponse(postId: string, raw: string): DeepAnalysisResult {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      return {
        postId,
        summary: parsed.summary ?? 'Unable to parse summary',
        sentiment: parsed.sentiment ?? 'NEUTRAL',
        reasoning: parsed.reasoning ?? '',
        keyThemes: parsed.keyThemes ?? [],
        riskLevel: parsed.riskLevel ?? 'MEDIUM',
        recommendation: parsed.recommendation ?? '',
        analyzedAt: new Date().toISOString(),
      };
    } catch {
      this.logger.warn(`Failed to parse LLM response for post [${postId}]`);
      return this.mockAnalysis(postId, raw);
    }
  }

  private mockAnalysis(postId: string, content: string): DeepAnalysisResult {
    const lower = content.toLowerCase();
    const bullishWords = ['bullish', 'moon', 'pump', 'rally', 'buy', 'up', 'rise'];
    const bearishWords = ['bearish', 'dump', 'crash', 'sell', 'down', 'fall', 'drop'];
    const bullCount = bullishWords.filter(w => lower.includes(w)).length;
    const bearCount = bearishWords.filter(w => lower.includes(w)).length;
    const sentiment = bullCount > bearCount ? 'BULLISH' : bearCount > bullCount ? 'BEARISH' : 'NEUTRAL';

    return {
      postId,
      summary: `Market post detected with ${sentiment.toLowerCase()} signals. OpenAI not configured — using mock analysis.`,
      sentiment,
      reasoning: 'Mock analysis based on keyword presence. Configure OPENAI_API_KEY for real LLM analysis.',
      keyThemes: ['market sentiment', 'social signal'],
      riskLevel: 'MEDIUM',
      recommendation: 'Configure OPENAI_API_KEY in .env for detailed LLM-powered analysis.',
      analyzedAt: new Date().toISOString(),
    };
  }
}
