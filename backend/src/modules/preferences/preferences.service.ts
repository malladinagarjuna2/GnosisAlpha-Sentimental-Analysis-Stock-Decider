// src/modules/preferences/preferences.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpdatePreferenceDto } from './dto/update-preference.dto';

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get all preferences for a user (with asset details) */
  findByUser(userId: string) {
    return this.prisma.userPreference.findMany({
      where: { userId },
      include: { asset: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Create or update a preference (alertEnabled toggle) */
  async upsert(userId: string, dto: UpdatePreferenceDto) {
    // Verify asset exists
    const asset = await this.prisma.asset.findUnique({
      where: { id: dto.assetId },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    return this.prisma.userPreference.upsert({
      where: { userId_assetId: { userId, assetId: dto.assetId } },
      create: {
        userId,
        assetId: dto.assetId,
        alertEnabled: dto.alertEnabled ?? true,
      },
      update: {
        ...(dto.alertEnabled !== undefined && { alertEnabled: dto.alertEnabled }),
      },
      include: { asset: true },
    });
  }

  /** Toggle alertEnabled for a specific preference */
  async toggleAlert(userId: string, assetId: string) {
    const pref = await this.prisma.userPreference.findUnique({
      where: { userId_assetId: { userId, assetId } },
    });
    if (!pref) throw new NotFoundException('Preference not found — track the asset first');

    return this.prisma.userPreference.update({
      where: { id: pref.id },
      data: { alertEnabled: !pref.alertEnabled },
      include: { asset: true },
    });
  }
}
