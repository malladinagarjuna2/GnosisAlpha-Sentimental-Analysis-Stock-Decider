// src/modules/whale/whale.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WhaleService } from './whale.service';
import { WhaleCheckDto } from './dto/whale-check.dto';

@Controller('whale')
@UseGuards(JwtAuthGuard)
export class WhaleController {
  constructor(private readonly whaleService: WhaleService) {}

  /**
   * POST /api/whale/check
   * Manual whale activity check — useful for testing and debugging.
   * In production this runs internally within the ingestion pipeline.
   */
  @Post('check')
  check(@Body() dto: WhaleCheckDto) {
    return this.whaleService.detect(dto);
  }
}
