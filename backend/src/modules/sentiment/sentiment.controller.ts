// src/modules/sentiment/sentiment.controller.ts
import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SentimentService } from './sentiment.service';

class LlmAnalysisDto {
  text: string;
}

@Controller('sentiment')
@UseGuards(JwtAuthGuard)
export class SentimentController {
  constructor(private readonly sentimentService: SentimentService) {}

  /**
   * On-demand LLM deep analysis — triggered only by user clicking a post.
   */
  @Post('analyze-llm/:postId')
  analyzeWithLlm(
    @Param('postId') postId: string,
    @Body() dto: LlmAnalysisDto,
  ) {
    return this.sentimentService.analyzeWithLlm({ postId, text: dto.text });
  }
}
