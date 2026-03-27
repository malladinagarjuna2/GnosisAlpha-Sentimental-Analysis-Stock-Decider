// src/modules/alerts/alerts.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser, AuthUser } from '../../common/decorators/get-user.decorator';
import { AlertsService } from './alerts.service';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  /** GET /api/alerts — get current user's alert history */
  @Get()
  findMine(@GetUser() user: AuthUser) {
    return this.alertsService.findByUser(user.userId);
  }
}
