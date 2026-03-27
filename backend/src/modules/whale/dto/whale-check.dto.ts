// src/modules/whale/dto/whale-check.dto.ts
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * Input DTO for a whale activity check.
 * All metric fields are optional — provide what you have from the data source.
 */
export class WhaleCheckDto {
  @IsString()
  content: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  authorFollowers?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  mentionCount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  retweetCount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  likeCount?: number;
}
