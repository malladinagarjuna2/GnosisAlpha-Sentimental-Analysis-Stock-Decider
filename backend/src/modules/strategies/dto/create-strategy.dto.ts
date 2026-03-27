// src/modules/strategies/dto/create-strategy.dto.ts
import { IsBoolean, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import type { StrategyConfig } from './strategy-config.interface';

export class CreateStrategyDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  config: StrategyConfig;
}
