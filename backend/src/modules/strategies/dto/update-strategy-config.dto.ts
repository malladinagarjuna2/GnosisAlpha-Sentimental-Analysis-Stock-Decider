// src/modules/strategies/dto/update-strategy-config.dto.ts
import {
  IsArray, IsEnum, IsNumber, IsOptional, IsString, Max, Min,
} from 'class-validator';
import { SentimentCategory } from '@prisma/client';

export class UpdateStrategyConfigDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywordsPositive?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywordsNegative?: string[];

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  impactThreshold?: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  confidenceThreshold?: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  sentimentWeight?: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  impactWeight?: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  sentimentThreshold?: number;

  @IsArray()
  @IsEnum(SentimentCategory, { each: true })
  @IsOptional()
  categories?: SentimentCategory[];
}
