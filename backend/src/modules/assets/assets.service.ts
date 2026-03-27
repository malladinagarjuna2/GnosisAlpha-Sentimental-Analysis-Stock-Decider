// src/modules/assets/assets.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssetType } from '@prisma/client';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.asset.findMany({ orderBy: { symbol: 'asc' } });
  }

  findById(id: string) {
    return this.prisma.asset.findUnique({ where: { id } });
  }

  findBySymbol(symbol: string) {
    return this.prisma.asset.findUnique({ where: { symbol: symbol.toUpperCase() } });
  }

  create(data: { name: string; symbol: string; type: AssetType }) {
    return this.prisma.asset.create({
      data: { ...data, symbol: data.symbol.toUpperCase() },
    });
  }

  // Get assets tracked by a user
  findByUser(userId: string) {
    return this.prisma.userPreference.findMany({
      where: { userId },
      include: { asset: true },
    });
  }

  // Track / untrack an asset for a user
  trackAsset(userId: string, assetId: string) {
    return this.prisma.userPreference.upsert({
      where: { userId_assetId: { userId, assetId } },
      create: { userId, assetId, alertEnabled: true },
      update: {},
    });
  }

  untrackAsset(userId: string, assetId: string) {
    return this.prisma.userPreference.delete({
      where: { userId_assetId: { userId, assetId } },
    });
  }
}
