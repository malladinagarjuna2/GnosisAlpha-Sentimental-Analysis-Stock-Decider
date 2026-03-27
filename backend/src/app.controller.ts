// src/app.controller.ts — Health endpoint
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** GET /api/health — liveness probe */
  @Get('health')
  health() {
    return this.appService.health();
  }
}
