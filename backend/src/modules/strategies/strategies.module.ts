// src/modules/strategies/strategies.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StrategiesController } from './strategies.controller';
import { StrategiesService } from './strategies.service';
import { StrategyGeneratorService } from './strategy-generator.service';
import { ProfileModule } from '../profile/profile.module';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [ConfigModule, ProfileModule, AgentsModule],
  controllers: [StrategiesController],
  providers: [StrategiesService, StrategyGeneratorService],
  exports: [StrategiesService, StrategyGeneratorService],
})
export class StrategiesModule {}
