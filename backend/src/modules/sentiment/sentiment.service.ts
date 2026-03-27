// src/modules/sentiment/sentiment.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SentimentCategory, AnalysisMethod } from '@prisma/client';

export interface SentimentInput {
  postId: string;
  text: string;
}

export interface SentimentOutput {
  sentimentScore: number;   // -1 to 1
  impactScore: number;      // 0 to 100
  confidence: number;       // 0 to 1
  category: SentimentCategory;
  reason?: string;
  isWhaleAlert?: boolean;
}

@Injectable()
export class SentimentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fast NLP-based sentiment analysis (default — runs automatically for every post).
   * Currently a stub: returns a neutral score. Will be replaced by a real NLP model.
   */
  async analyzeWithNlp(input: SentimentInput): Promise<SentimentOutput> {
    // TODO: integrate Sentiment.js or custom NLP model
    const stub: SentimentOutput = {
      sentimentScore: 0,
      impactScore: 50,
      confidence: 0.5,
      category: SentimentCategory.SOCIAL_BUZZ,
      reason: 'Stub — NLP engine not yet integrated',
    };
    return stub;
  }

  /**
   * LLM-based deep analysis — ONLY called on-demand when user clicks a post.
   * NOT invoked automatically.
   */
  async analyzeWithLlm(input: SentimentInput): Promise<SentimentOutput> {
    // TODO: integrate OpenAI / Gemini call here
    throw new Error('LLM analysis not yet implemented');
  }

  async saveResult(postId: string, output: SentimentOutput, method: AnalysisMethod = AnalysisMethod.NLP) {
    return this.prisma.sentimentResult.upsert({
      where: { postId },
      create: { postId, ...output, analyzedBy: method },
      update: { ...output, analyzedBy: method },
    });
  }

  async getForPost(postId: string) {
    return this.prisma.sentimentResult.findUnique({ where: { postId } });
  }
}
