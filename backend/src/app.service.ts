// src/app.service.ts — Health service
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health(): Record<string, string> {
    return {
      status: 'ok',
      service: 'market-sentiment-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
