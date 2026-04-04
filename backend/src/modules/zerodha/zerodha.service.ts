// src/modules/zerodha/zerodha.service.ts
// Zerodha Kite Connect integration — holdings, funds, positions, order placement.
// Access token is manually pasted in .env (Option A — rotates daily).
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import axios, { AxiosInstance } from 'axios';
import type { PlaceOrderDto } from './dto/place-order.dto';

const KITE_BASE = 'https://api.kite.trade';

export interface KiteHolding {
  tradingsymbol: string;
  exchange: string;
  isin: string;
  product: string;
  quantity: number;
  averagePrice: number;
  lastPrice: number;
  closePrice: number;
  pnl: number;
  dayChange: number;
  dayChangePct: number;
  currentValue: number;
  investedValue: number;
}

export interface KiteFunds {
  equity: {
    net: number;
    available: number;
    usedMargin: number;
  };
  commodity: {
    net: number;
    available: number;
    usedMargin: number;
  };
}

export interface KitePosition {
  tradingsymbol: string;
  exchange: string;
  product: string;
  quantity: number;
  averagePrice: number;
  lastPrice: number;
  pnl: number;
  side: 'BUY' | 'SELL' | 'NONE';
}

export interface KitePortfolioSummary {
  totalInvested: number;
  currentValue: number;
  totalPnL: number;
  totalPnLPct: number;
  dayPnL: number;
  holdingCount: number;
  availableCash: number;
  holdings: KiteHolding[];
}

@Injectable()
export class ZerodhaService {
  private readonly logger = new Logger(ZerodhaService.name);
  private readonly kite: AxiosInstance;
  private readonly isConfigured: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey     = this.config.get<string>('KITE_API_KEY') ?? '';
    const accessToken = this.config.get<string>('KITE_ACCESS_TOKEN') ?? '';

    this.isConfigured = !!(apiKey && accessToken);

    this.kite = axios.create({
      baseURL: KITE_BASE,
      headers: {
        'X-Kite-Version': '3',
        ...(this.isConfigured
          ? { Authorization: `token ${apiKey}:${accessToken}` }
          : {}),
      },
      timeout: 15000,
    });

    if (this.isConfigured) {
      this.logger.log('📈 Zerodha Kite client initialized');
    } else {
      this.logger.warn('⚠️  KITE_API_KEY or KITE_ACCESS_TOKEN not set — Zerodha unavailable');
    }
  }

  private assertConfigured() {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        'Zerodha not connected. Add KITE_API_KEY and KITE_ACCESS_TOKEN to .env',
      );
    }
  }

  // ─── Holdings ──────────────────────────────────────────────────────────────

  async getHoldings(): Promise<KiteHolding[]> {
    this.assertConfigured();
    const res = await this.kite.get('/portfolio/holdings');
    const raw: any[] = res.data?.data ?? [];

    return raw.map(h => ({
      tradingsymbol:  h.tradingsymbol,
      exchange:       h.exchange,
      isin:           h.isin,
      product:        h.product,
      quantity:       h.quantity,
      averagePrice:   h.average_price,
      lastPrice:      h.last_price,
      closePrice:     h.close_price,
      pnl:            h.pnl,
      dayChange:      h.day_change,
      dayChangePct:   h.day_change_percentage,
      currentValue:   h.last_price * h.quantity,
      investedValue:  h.average_price * h.quantity,
    }));
  }

  // ─── Portfolio Summary ─────────────────────────────────────────────────────

  async getPortfolioSummary(): Promise<KitePortfolioSummary> {
    const [holdings, funds] = await Promise.all([
      this.getHoldings(),
      this.getFunds(),
    ]);

    const totalInvested = holdings.reduce((s, h) => s + h.investedValue, 0);
    const currentValue  = holdings.reduce((s, h) => s + h.currentValue, 0);
    const totalPnL      = currentValue - totalInvested;
    const totalPnLPct   = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
    const dayPnL        = holdings.reduce((s, h) => s + h.dayChange * h.quantity, 0);

    return {
      totalInvested,
      currentValue,
      totalPnL,
      totalPnLPct,
      dayPnL,
      holdingCount:   holdings.length,
      availableCash:  funds.equity.available,
      holdings,
    };
  }

  // ─── Funds ─────────────────────────────────────────────────────────────────

  async getFunds(): Promise<KiteFunds> {
    this.assertConfigured();
    const res = await this.kite.get('/user/margins');
    const d = res.data?.data ?? {};
    return {
      equity: {
        net:        d.equity?.net ?? 0,
        available:  d.equity?.available?.live_balance ?? d.equity?.available?.cash ?? 0,
        usedMargin: d.equity?.utilised?.debits ?? 0,
      },
      commodity: {
        net:        d.commodity?.net ?? 0,
        available:  d.commodity?.available?.live_balance ?? 0,
        usedMargin: d.commodity?.utilised?.debits ?? 0,
      },
    };
  }

  // ─── Positions ─────────────────────────────────────────────────────────────

  async getPositions(): Promise<KitePosition[]> {
    this.assertConfigured();
    const res = await this.kite.get('/portfolio/positions');
    const net: any[] = res.data?.data?.net ?? [];

    return net
      .filter(p => p.quantity !== 0)
      .map(p => ({
        tradingsymbol: p.tradingsymbol,
        exchange:      p.exchange,
        product:       p.product,
        quantity:      Math.abs(p.quantity),
        averagePrice:  p.average_price,
        lastPrice:     p.last_price,
        pnl:           p.pnl,
        side:          p.quantity > 0 ? 'BUY' : p.quantity < 0 ? 'SELL' : 'NONE',
      }));
  }

  // ─── Order Placement ───────────────────────────────────────────────────────

  async placeOrder(userId: string, dto: PlaceOrderDto): Promise<{ orderId: string; status: string }> {
    this.assertConfigured();

    const params = new URLSearchParams({
      tradingsymbol: dto.tradingsymbol.toUpperCase(),
      exchange:      dto.exchange,
      transaction_type: dto.side,
      quantity:      String(dto.quantity),
      order_type:    dto.orderType,
      product:       'CNC',
      validity:      'DAY',
      ...(dto.orderType === 'LIMIT' && dto.price ? { price: String(dto.price) } : {}),
    });

    const res = await this.kite.post('/orders/regular', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const orderId = res.data?.data?.order_id ?? 'unknown';

    // Audit log in DB
    await this.prisma.tradeOrder.create({
      data: {
        userId,
        postId:      dto.postId ?? null,
        symbol:      dto.tradingsymbol.toUpperCase(),
        exchange:    dto.exchange,
        orderType:   dto.orderType,
        side:        dto.side,
        qty:         dto.quantity,
        price:       dto.price ?? null,
        kiteOrderId: orderId,
        status:      'PLACED',
      },
    });

    this.logger.log(
      `📋 Order placed: ${dto.side} ${dto.quantity}x ${dto.tradingsymbol} @ ${dto.orderType} — orderId=${orderId}`,
    );

    return { orderId, status: 'PLACED' };
  }

  // ─── Order History ─────────────────────────────────────────────────────────

  async getOrders(): Promise<any[]> {
    this.assertConfigured();
    const res = await this.kite.get('/orders');
    return (res.data?.data ?? []).slice(0, 20); // last 20
  }

  // ─── Connection check ──────────────────────────────────────────────────────

  async checkConnection(): Promise<{ connected: boolean; userId?: string; userName?: string }> {
    if (!this.isConfigured) return { connected: false };
    try {
      const res = await this.kite.get('/user/profile');
      const d = res.data?.data;
      return { connected: true, userId: d?.user_id, userName: d?.user_name };
    } catch {
      return { connected: false };
    }
  }
}
