// src/modules/alerts/dto/create-alert.dto.ts
import { IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { AlertType } from '@prisma/client';

export class CreateAlertDto {
  @IsString()
  userId: string;

  @IsEnum(AlertType, { message: 'type must be EMAIL or IN_APP' })
  type: AlertType;

  @IsString()
  @MinLength(1)
  message: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
