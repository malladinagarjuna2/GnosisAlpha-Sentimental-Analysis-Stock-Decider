// src/modules/zerodha/zerodha.controller.ts
import {
  Controller, Get, Post, Body, UseGuards, Request,
} from '@nestjs/common';
import { ZerodhaService } from './zerodha.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('zerodha')
export class ZerodhaController {
  constructor(private readonly zerodha: ZerodhaService) {}

  /** GET /api/zerodha/status — check if Kite credentials are valid */
  @Get('status')
  status() {
    return this.zerodha.checkConnection();
  }

  /** GET /api/zerodha/portfolio — summary + all holdings */
  @Get('portfolio')
  portfolio() {
    return this.zerodha.getPortfolioSummary();
  }

  /** GET /api/zerodha/holdings — raw holdings list */
  @Get('holdings')
  holdings() {
    return this.zerodha.getHoldings();
  }

  /** GET /api/zerodha/funds — available cash + margins */
  @Get('funds')
  funds() {
    return this.zerodha.getFunds();
  }

  /** GET /api/zerodha/positions — open intraday/short-term positions */
  @Get('positions')
  positions() {
    return this.zerodha.getPositions();
  }

  /** GET /api/zerodha/orders — last 20 orders */
  @Get('orders')
  orders() {
    return this.zerodha.getOrders();
  }

  /** POST /api/zerodha/order — place a BUY or SELL order (requires confirmation on frontend) */
  @Post('order')
  placeOrder(@Request() req: any, @Body() dto: PlaceOrderDto) {
    return this.zerodha.placeOrder(req.user.id, dto);
  }
}
