// src/modules/analysis/analysis.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { DeepAnalysisDto } from './dto/deep-analysis.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  /**
   * POST /analysis/deep
   * On-demand LLM deep analysis for a specific post.
   * NEVER called automatically — only triggered by user action.
   */
  @Post('deep')
  deepAnalysis(@Body() dto: DeepAnalysisDto) {
    return this.analysisService.deepAnalyze(dto.postId);
  }
}
