// src/modules/preferences/dto/update-preference.dto.ts
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class UpdatePreferenceDto {
  @IsUUID()
  assetId: string;

  @IsBoolean()
  @IsOptional()
  alertEnabled?: boolean;
}
