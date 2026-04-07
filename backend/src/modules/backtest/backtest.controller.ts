// src/modules/backtest/backtest.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser, AuthUser } from '../../common/decorators/get-user.decorator';
import { BacktestService } from './backtest.service';
import { BacktestRequestDto } from './dto/backtest-request.dto';

@Controller('backtest')
@UseGuards(JwtAuthGuard)
export class BacktestController {
  constructor(private readonly backtestService: BacktestService) {}

  /**
   * POST /api/backtest
   * Run a 7-day backtest for specified NSE stocks.
   * Scrapes trusted channels, runs sentiment analysis, simulates trades,
   * and returns projected P&L.
   */
  @Post()
  async run(@GetUser() user: AuthUser, @Body() dto: BacktestRequestDto) {
    return this.backtestService.runBacktest(user.userId, dto);
  }
}
