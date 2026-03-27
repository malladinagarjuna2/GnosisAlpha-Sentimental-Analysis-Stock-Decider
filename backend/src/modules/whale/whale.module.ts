// src/modules/whale/whale.module.ts
import { Module } from '@nestjs/common';
import { WhaleController } from './whale.controller';
import { WhaleService } from './whale.service';

@Module({
  controllers: [WhaleController],
  providers: [WhaleService],
  exports: [WhaleService],
})
export class WhaleModule {}
