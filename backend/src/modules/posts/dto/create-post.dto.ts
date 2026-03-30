// src/modules/posts/dto/create-post.dto.ts
import { IsEnum, IsString, IsOptional, IsDateString, MinLength } from 'class-validator';
import { PostSource } from '@prisma/client';

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  assetId: string;

  @IsEnum(PostSource, { message: 'source must be TWITTER or REDDIT' })
  source: PostSource;

  @IsString()
  @MinLength(1)
  content: string;

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  url?: string;

  @IsDateString()
  @IsOptional()
  postedAt?: string;
}
