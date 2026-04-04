// src/modules/backtest/dto/backtest-request.dto.ts
import { IsArray, IsString, IsOptional, IsNumber, IsObject, Min, Max, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class BacktestRequestDto {
  /** Stock symbols to backtest, e.g. ["RELIANCE", "TCS"] */
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  assets: string[];

  /** Lookback period in days (max 7 — Twitter API limit) */
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7)
  @Type(() => Number)
  lookbackDays?: number; // defaults to 7

  /** Capital to simulate with, in INR */
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Type(() => Number)
  capitalAmount?: number; // defaults from InvestorProfile or 100000

  /**
   * Optional strategy config override.
   * If omitted, uses user's active strategy.
   */
  @IsOptional()
  @IsObject()
  strategyConfig?: {
    sentimentThreshold?: number;
    impactThreshold?: number;
    confidenceThreshold?: number;
    sentimentWeight?: number;
    impactWeight?: number;
  };
}
