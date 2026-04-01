// src/modules/fetcher/seeder.service.ts
// Seeds mock assets idempotently. Exposes a public seed() method
// so FetcherService can call it explicitly before the first poll.
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssetType, SocialPlatform } from '@prisma/client';

const MOCK_ASSETS = [
  { symbol: 'BTC',  name: 'Bitcoin',    type: AssetType.CRYPTO },
  { symbol: 'ETH',  name: 'Ethereum',   type: AssetType.CRYPTO },
  { symbol: 'SOL',  name: 'Solana',     type: AssetType.CRYPTO },
  { symbol: 'TSLA', name: 'Tesla',      type: AssetType.STOCK  },
  { symbol: 'AAPL', name: 'Apple Inc.', type: AssetType.STOCK  },
] as const;

const DEFAULT_CHANNELS = [
  { platform: SocialPlatform.TWITTER, handle: 'elonmusk',          displayName: 'Elon Musk' },
  { platform: SocialPlatform.TWITTER, handle: 'POTUS',             displayName: 'President of the United States' },
  { platform: SocialPlatform.TWITTER, handle: 'Ro_Kum',            displayName: 'Ro Kum' },
  { platform: SocialPlatform.TWITTER, handle: 'VitalikButerin',    displayName: 'Vitalik Buterin' },
  { platform: SocialPlatform.TWITTER, handle: 'CryptoCred',        displayName: 'CryptoCred' },
  { platform: SocialPlatform.TWITTER, handle: 'weekaborkar',       displayName: 'Weekend Investing' },
] as const;

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);
  private seeded = false;

  constructor(private readonly prisma: PrismaService) {}

  async seed(): Promise<void> {
    if (this.seeded) return;

    // Seed assets
    for (const asset of MOCK_ASSETS) {
      await this.prisma.asset.upsert({
        where:  { symbol: asset.symbol },
        create: { ...asset },
        update: {},
      });
    }
    this.logger.log(`✅ Assets seeded (${MOCK_ASSETS.length})`);

    // Seed default social channels
    for (const ch of DEFAULT_CHANNELS) {
      await this.prisma.socialChannel.upsert({
        where:  { platform_handle: { platform: ch.platform, handle: ch.handle } },
        create: { platform: ch.platform, handle: ch.handle, displayName: ch.displayName, isDefault: true },
        update: { displayName: ch.displayName, isDefault: true },
      });
    }
    this.logger.log(`✅ Default channels seeded (${DEFAULT_CHANNELS.length})`);

    this.seeded = true;
  }
}
