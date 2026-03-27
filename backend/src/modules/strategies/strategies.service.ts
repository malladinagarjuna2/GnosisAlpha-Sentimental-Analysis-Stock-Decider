// src/modules/strategies/strategies.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { StrategyConfig } from './dto/strategy-config.interface';
import type { CreateStrategyDto } from './dto/create-strategy.dto';
import type { UpdateStrategyDto } from './dto/update-strategy.dto';
import { SentimentCategory } from '@prisma/client';

export type { StrategyConfig };

@Injectable()
export class StrategiesService {
  constructor(private readonly prisma: PrismaService) {}

  findByUser(userId: string) {
    return this.prisma.strategy.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.strategy.findUnique({ where: { id } });
  }

  create(userId: string, dto: CreateStrategyDto) {
    return this.prisma.strategy.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        config: dto.config as object,
      },
    });
  }

  update(id: string, dto: UpdateStrategyDto) {
    return this.prisma.strategy.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.config !== undefined && { config: dto.config as object }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  delete(id: string) {
    return this.prisma.strategy.delete({ where: { id } });
  }

  /**
   * Evaluate whether a sentiment result triggers an alert for a given strategy config.
   * Returns true if the alert should fire.
   */
  evaluate(
    config: StrategyConfig,
    result: {
      sentimentScore: number;
      impactScore: number;
      confidence: number;
      category: SentimentCategory;
    },
  ): boolean {
    if (result.confidence < config.confidenceThreshold) return false;
    if (!config.categories.includes(result.category)) return false;

    const composite =
      result.sentimentScore * config.sentimentWeight +
      (result.impactScore / 100) * config.impactWeight;

    return Math.abs(composite) >= config.sentimentThreshold;
  }
}
