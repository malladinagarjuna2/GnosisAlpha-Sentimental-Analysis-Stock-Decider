// src/modules/zerodha/zerodha.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ZerodhaController } from './zerodha.controller';
import { ZerodhaService } from './zerodha.service';

@Module({
  imports: [ConfigModule],
  controllers: [ZerodhaController],
  providers: [ZerodhaService],
  exports: [ZerodhaService],
})
export class ZerodhaModule {}
