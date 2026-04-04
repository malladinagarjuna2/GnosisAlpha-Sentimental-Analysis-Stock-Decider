// src/modules/profile/dto/upsert-profile.dto.ts
import { IsNumber, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// Use string enum to avoid Prisma client caching issues in IDE
export enum InvestHorizonDto {
  SHORT_TERM = 'SHORT_TERM',
  MEDIUM_TERM = 'MEDIUM_TERM',
  LONG_TERM = 'LONG_TERM',
}

export class UpsertProfileDto {
  /** Risk tolerance: 1 (conservative) to 10 (aggressive) */
  @IsNumber()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  riskTolerance: number;

  /** Investment horizon */
  @IsEnum(InvestHorizonDto)
  horizon: InvestHorizonDto;

  /** Capital amount in INR */
  @IsNumber()
  @Min(1000)
  @Type(() => Number)
  capitalAmount: number;
}
