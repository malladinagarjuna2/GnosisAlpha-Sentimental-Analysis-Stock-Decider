// src/modules/strategies/dto/update-strategy.dto.ts
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import type { StrategyConfig } from './strategy-config.interface';

export class UpdateStrategyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  config?: StrategyConfig;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
