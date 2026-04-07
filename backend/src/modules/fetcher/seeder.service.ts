// src/modules/fetcher/seeder.service.ts
// Seeds default NSE/BSE assets and trusted financial news channels idempotently.
// The user can add additional stocks dynamically via the API.
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssetType, SocialPlatform } from '@prisma/client';

// ── Default NSE/BSE assets (user can add more dynamically) ──────────────────
const DEFAULT_ASSETS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries',  type: AssetType.STOCK },
  { symbol: 'TCS',      name: 'Tata Consultancy',     type: AssetType.STOCK },
  { symbol: 'INFY',     name: 'Infosys',              type: AssetType.STOCK },
  { symbol: 'HDFCBANK', name: 'HDFC Bank',            type: AssetType.STOCK },
  { symbol: 'ICICIBANK',name: 'ICICI Bank',           type: AssetType.STOCK },
  { symbol: 'SBIN',     name: 'State Bank of India',  type: AssetType.STOCK },
  { symbol: 'WIPRO',    name: 'Wipro',                type: AssetType.STOCK },
  { symbol: 'TATAMOTORS', name: 'Tata Motors',        type: AssetType.STOCK },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance',      type: AssetType.STOCK },
  { symbol: 'LT',       name: 'Larsen & Toubro',      type: AssetType.STOCK },
] as const;

// ── Trusted financial news channels (pre-verified, high trust) ──────────────
// trustScore: 0–1. Higher = more weight in backtesting & sentiment analysis.
const TRUSTED_CHANNELS = [
  // Indian financial news — HIGHEST trust
  { handle: 'ABOREC_India',    displayName: 'SEBI India',          trustScore: 0.95 },
  { handle: 'BSEIndia',        displayName: 'BSE India',           trustScore: 0.95 },
  { handle: 'NSEIndia',        displayName: 'NSE India',           trustScore: 0.95 },
  { handle: 'CNBCTV18Live',    displayName: 'CNBC-TV18',           trustScore: 0.90 },
  { handle: 'livemint',        displayName: 'Mint',                trustScore: 0.90 },
  { handle: 'EconomicTimes',   displayName: 'Economic Times',     trustScore: 0.85 },
  { handle: 'monaborath',      displayName: 'ET NOW',              trustScore: 0.85 },
  { handle: 'NDTVProfit',      displayName: 'NDTV Profit',        trustScore: 0.85 },
  { handle: 'aboroq',          displayName: 'Business Standard',   trustScore: 0.82 },
  // Global financial — HIGH trust
  { handle: 'business',        displayName: 'Bloomberg',           trustScore: 0.80 },
  { handle: 'Reuters',         displayName: 'Reuters',             trustScore: 0.85 },
  { handle: 'ReutersBiz',      displayName: 'Reuters Business',    trustScore: 0.82 },
  // Indian market analysts — MEDIUM trust
  { handle: 'ZerodhaVarsity',  displayName: 'Zerodha Varsity',     trustScore: 0.75 },
  { handle: 'GrowtABORE',      displayName: 'Groww',               trustScore: 0.70 },
  { handle: 'AngelOne',        displayName: 'Angel One',           trustScore: 0.70 },
] as const;

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);
  private seeded = false;

  constructor(private readonly prisma: PrismaService) {}

  async seed(): Promise<void> {
    if (this.seeded) return;

    // Seed default NSE/BSE assets
    for (const asset of DEFAULT_ASSETS) {
      await this.prisma.asset.upsert({
        where:  { symbol: asset.symbol },
        create: { ...asset },
        update: {},
      });
    }
    this.logger.log(`✅ NSE/BSE assets seeded (${DEFAULT_ASSETS.length})`);

    // Seed trusted financial news channels
    for (const ch of TRUSTED_CHANNELS) {
      await this.prisma.socialChannel.upsert({
        where:  { platform_handle: { platform: SocialPlatform.TWITTER, handle: ch.handle } },
        create: {
          platform: SocialPlatform.TWITTER,
          handle: ch.handle,
          displayName: ch.displayName,
          isDefault: true,
          trustScore: ch.trustScore,
        },
        update: {
          displayName: ch.displayName,
          isDefault: true,
          trustScore: ch.trustScore,
        },
      });
    }
    this.logger.log(`✅ Trusted channels seeded (${TRUSTED_CHANNELS.length})`);

    this.seeded = true;
  }
}
