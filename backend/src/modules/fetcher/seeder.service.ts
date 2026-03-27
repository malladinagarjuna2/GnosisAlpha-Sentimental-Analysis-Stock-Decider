// src/modules/fetcher/seeder.service.ts
// Seeds mock assets idempotently. Exposes a public seed() method
// so FetcherService can call it explicitly before the first poll.
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssetType } from '@prisma/client';

const MOCK_ASSETS = [
  { symbol: 'BTC',  name: 'Bitcoin',    type: AssetType.CRYPTO },
  { symbol: 'ETH',  name: 'Ethereum',   type: AssetType.CRYPTO },
  { symbol: 'SOL',  name: 'Solana',     type: AssetType.CRYPTO },
  { symbol: 'TSLA', name: 'Tesla',      type: AssetType.STOCK  },
  { symbol: 'AAPL', name: 'Apple Inc.', type: AssetType.STOCK  },
] as const;

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);
  private seeded = false;

  constructor(private readonly prisma: PrismaService) {}

  async seed(): Promise<void> {
    if (this.seeded) return; // idempotent even within a process lifetime
    for (const asset of MOCK_ASSETS) {
      await this.prisma.asset.upsert({
        where:  { symbol: asset.symbol },
        create: { ...asset },
        update: {},
      });
    }
    this.seeded = true;
    this.logger.log(`✅ Mock assets seeded (${MOCK_ASSETS.length})`);
  }
}
