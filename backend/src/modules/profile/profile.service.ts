// src/modules/profile/profile.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpsertProfileDto } from './dto/upsert-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, dto: UpsertProfileDto) {
    return this.prisma.investorProfile.upsert({
      where: { userId },
      create: {
        userId,
        riskTolerance: dto.riskTolerance,
        horizon: dto.horizon,
        capitalAmount: dto.capitalAmount,
      },
      update: {
        riskTolerance: dto.riskTolerance,
        horizon: dto.horizon,
        capitalAmount: dto.capitalAmount,
      },
    });
  }

  findByUser(userId: string) {
    return this.prisma.investorProfile.findUnique({ where: { userId } });
  }
}
