// src/modules/sentiment/sentiment.module.ts
// LAYER 4: Feature module — HTTP only. Zero queue or worker awareness.
import { Module } from '@nestjs/common';
import { SentimentController } from './sentiment.controller';
import { SentimentService } from './sentiment.service';

@Module({
  controllers: [SentimentController],
  providers:   [SentimentService],
  exports:     [SentimentService], // WorkersModule imports this to get SentimentService
})
export class SentimentModule {}
