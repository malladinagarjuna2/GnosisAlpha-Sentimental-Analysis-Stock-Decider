// src/modules/strategies/strategies.controller.ts
import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser, AuthUser } from '../../common/decorators/get-user.decorator';
import { StrategiesService, DEFAULT_STRATEGY_CONFIG } from './strategies.service';
import { StrategyGeneratorService } from './strategy-generator.service';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';
import { UpdateStrategyConfigDto } from './dto/update-strategy-config.dto';
import type { StrategyConfig } from './dto/strategy-config.interface';

@Controller('strategies')
@UseGuards(JwtAuthGuard)
export class StrategiesController {
  constructor(
    private readonly strategiesService: StrategiesService,
    private readonly generatorService: StrategyGeneratorService,
  ) {}

  // ─── AI Strategy Generator ───────────────────────────────────────────────────

  /**
   * POST /api/strategies/generate
   * Generate 3 personalized strategies (Conservative/Balanced/Aggressive)
   * based on user's InvestorProfile + recent sentiment data.
   * Body: { "assets": ["RELIANCE", "TCS"] }
   */
  @Post('generate')
  generate(@GetUser() user: AuthUser, @Body() body: { assets: string[] }) {
    return this.generatorService.generate(user.userId, body.assets ?? []);
  }

  /**
   * POST /api/strategies/generate-from-post
   * Generate 3 strategies based on a specific post's deep analysis result.
   * Body: { postId, analysis: { summary, sentiment, reasoning, keyThemes, riskLevel, recommendation } }
   */
  @Post('generate-from-post')
  generateFromPost(
    @GetUser() user: AuthUser,
    @Body() body: {
      postId: string;
      analysis: {
        summary: string;
        sentiment: string;
        reasoning: string;
        keyThemes: string[];
        riskLevel: string;
        recommendation: string;
      };
    },
  ) {
    return this.generatorService.generateFromPost(user.userId, body.postId, body.analysis);
  }

  // ─── Step 8 spec endpoints ──────────────────────────────────────────────────

  /** GET /api/strategies/strategy — get user's active strategy config */
  @Get('strategy')
  getStrategy(@GetUser() user: AuthUser) {
    return this.strategiesService.getActiveConfig(user.userId);
  }

  /** POST /api/strategies/strategy/update — create or update user's active strategy */
  @Post('strategy/update')
  updateStrategy(@GetUser() user: AuthUser, @Body() dto: UpdateStrategyConfigDto) {
    const config: StrategyConfig = {
      ...DEFAULT_STRATEGY_CONFIG,
      ...dto,
    };
    return this.strategiesService.upsertActive(user.userId, config);
  }

  // ─── Full CRUD endpoints ────────────────────────────────────────────────────

  /** GET /api/strategies — list current user's strategies */
  @Get()
  findAll(@GetUser() user: AuthUser) {
    return this.strategiesService.findByUser(user.userId);
  }

  /** GET /api/strategies/:id */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.strategiesService.findById(id);
  }

  /** POST /api/strategies */
  @Post()
  create(@GetUser() user: AuthUser, @Body() dto: CreateStrategyDto) {
    return this.strategiesService.create(user.userId, dto);
  }

  /** PUT /api/strategies/:id */
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStrategyDto) {
    return this.strategiesService.update(id, dto);
  }

  /** DELETE /api/strategies/:id */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.strategiesService.delete(id);
  }
}
