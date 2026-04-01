// src/modules/alerts/alerts.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { EmailService } from './email.service';

@Module({
  imports: [ConfigModule],
  controllers: [AlertsController],
  providers: [AlertsService, EmailService],
  exports: [AlertsService],
})
export class AlertsModule {}
