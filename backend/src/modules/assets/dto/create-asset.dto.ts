// src/modules/assets/dto/create-asset.dto.ts
import { IsEnum, IsString, MinLength } from 'class-validator';
import { AssetType } from '@prisma/client';

export class CreateAssetDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  symbol: string;

  @IsEnum(AssetType, { message: 'type must be STOCK or CRYPTO' })
  type: AssetType;
}
