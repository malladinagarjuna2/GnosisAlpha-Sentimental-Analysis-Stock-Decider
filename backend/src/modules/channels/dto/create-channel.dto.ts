import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { SocialPlatform } from '@prisma/client';

export class CreateChannelDto {
  @IsEnum(SocialPlatform)
  platform: SocialPlatform;

  @IsString()
  @IsNotEmpty()
  handle: string;

  @IsString()
  @IsOptional()
  displayName?: string;
}
