'use client';

import { useState } from 'react';
import { zerodhaAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { KitePortfolioSummary, KiteHolding, PlaceOrderPayload } from '@/lib/types';
import {
  TrendingUp, TrendingDown, Wallet, RefreshCw, IndianRupee,
  BarChart3, ArrowUpRight, ArrowDownRight, ShoppingCart, X, AlertTriangle,
} from 'lucide-react';

interface OrderModal {
  holding: KiteHolding;
  side: 'BUY' | 'SELL';
}

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<KitePortfolioSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<OrderModal | null>(null);
  const [orderQty, setOrderQty] = useState(1);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState('');
  const [placing, setPlacing] = useState(false);

  const fetchPortfolio = async () => {
    setLoading(true);
    try {
      const res = await zerodhaAPI.portfolio();
      setPortfolio(res.data);
      toast.success('Portfolio loaded from Zerodha');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data ?? err?.message ?? 'Failed to load portfolio';
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const openOrderModal = (holding: KiteHolding, side: 'BUY' | 'SELL') => {
    setOrderQty(1);
    setOrderType('MARKET');
    setLimitPrice(holding.lastPrice.toFixed(2));
    setModal({ holding, side });
  };

  const confirmOrder = async () => {
    if (!modal) return;
    setPlacing(true);
    try {
      const payload: PlaceOrderPayload = {
        tradingsymbol: modal.holding.tradingsymbol,
        exchange: modal.holding.exchange as 'NSE' | 'BSE',
        side: modal.side,
        quantity: orderQty,
        orderType,
        price: orderType === 'LIMIT' ? parseFloat(limitPrice) : undefined,
      };
      const res = await zerodhaAPI.placeOrder(payload);
      toast.success(
        `${modal.side} order placed — ${modal.holding.tradingsymbol} × ${orderQty} | Order ID: ${res.data.orderId}`
      );
      setModal(null);
      fetchPortfolio();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data ?? err?.message ?? 'Order failed';
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setPlacing(false);
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10">
            <BarChart3 className="h-7 w-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold gradient-text">Portfolio</h1>
            <p className="text-muted-foreground text-sm">Your Zerodha holdings &amp; real-time P&amp;L</p>
          </div>
        </div>
        <Button onClick={fetchPortfolio} disabled={loading} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {portfolio ? 'Refresh' : 'Load Portfolio'}
        </Button>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      )}

      {!loading && !portfolio && (
        <Card className="p-16 text-center border-border/20 bg-card/50">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">Connect your Zerodha account to see your portfolio</p>
          <p className="text-xs text-muted-foreground">Access token is read from your .env configuration</p>
          <Button onClick={fetchPortfolio} className="mt-6 gap-2">
            <RefreshCw className="h-4 w-4" /> Load Portfolio
          </Button>
        </Card>
      )}

      {!loading && portfolio && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Current Value',
                value: `₹${fmt(portfolio.currentValue)}`,
                icon: IndianRupee,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
              },
              {
                label: 'Total Invested',
                value: `₹${fmt(portfolio.totalInvested)}`,
                icon: Wallet,
                color: 'text-blue-400',
                bg: 'bg-blue-500/10',
              },
              {
                label: 'Total P&L',
                value: `${portfolio.totalPnL >= 0 ? '+' : ''}₹${fmt(portfolio.totalPnL)}`,
                sub: `${portfolio.totalPnLPct >= 0 ? '+' : ''}${portfolio.totalPnLPct.toFixed(2)}%`,
                icon: portfolio.totalPnL >= 0 ? TrendingUp : TrendingDown,
                color: portfolio.totalPnL >= 0 ? 'text-green-400' : 'text-red-400',
                bg: portfolio.totalPnL >= 0 ? 'bg-green-500/10' : 'bg-red-500/10',
              },
              {
                label: 'Available Cash',
                value: `₹${fmt(portfolio.availableCash)}`,
                icon: Wallet,
                color: 'text-amber-400',
                bg: 'bg-amber-500/10',
              },
            ].map((stat) => (
              <Card key={stat.label} className="p-4 border-border/20 bg-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className={`text-xl font-bold font-code ${stat.color}`}>{stat.value}</p>
                {stat.sub && <p className="text-xs text-muted-foreground font-code">{stat.sub}</p>}
              </Card>
            ))}
          </div>

          {/* Holdings Table */}
          <Card className="p-6 border-border/20 bg-card/50 backdrop-blur-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Holdings ({portfolio.holdingCount})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border/20">
                    <th className="text-left pb-3 font-medium">Symbol</th>
                    <th className="text-right pb-3 font-medium">Qty</th>
                    <th className="text-right pb-3 font-medium">Avg Price</th>
                    <th className="text-right pb-3 font-medium">LTP</th>
                    <th className="text-right pb-3 font-medium">Current Value</th>
                    <th className="text-right pb-3 font-medium">P&L</th>
                    <th className="text-right pb-3 font-medium">Day Change</th>
                    <th className="text-right pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  {portfolio.holdings.map((h) => (
                    <tr key={h.tradingsymbol + h.exchange} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-code">{h.tradingsymbol}</span>
                          <Badge variant="outline" className="text-xs">{h.exchange}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{h.product}</p>
                      </td>
                      <td className="text-right font-code py-3">{h.quantity}</td>
                      <td className="text-right font-code py-3">₹{fmt(h.averagePrice)}</td>
                      <td className="text-right font-code py-3">₹{fmt(h.lastPrice)}</td>
                      <td className="text-right font-code py-3">₹{fmt(h.currentValue)}</td>
                      <td className={`text-right font-code py-3 ${h.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {h.pnl >= 0 ? '+' : ''}₹{fmt(h.pnl)}
                      </td>
                      <td className={`text-right font-code py-3 text-xs ${h.dayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        <div className="flex items-center justify-end gap-1">
                          {h.dayChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {h.dayChangePct.toFixed(2)}%
                        </div>
                      </td>
                      <td className="text-right py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-green-400 border-green-500/30 hover:bg-green-500/10"
                            onClick={() => openOrderModal(h, 'BUY')}
                          >
                            <ArrowUpRight className="h-3 w-3 mr-1" /> BUY
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
                            onClick={() => openOrderModal(h, 'SELL')}
                          >
                            <ArrowDownRight className="h-3 w-3 mr-1" /> SELL
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Order Confirmation Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 border-border/20 bg-card shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${modal.side === 'BUY' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  <ShoppingCart className={`h-5 w-5 ${modal.side === 'BUY' ? 'text-green-400' : 'text-red-400'}`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{modal.side} Order</h3>
                  <p className="text-sm text-muted-foreground font-code">{modal.holding.tradingsymbol} · {modal.holding.exchange}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setModal(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Current Price */}
            <div className="p-3 rounded-lg bg-muted/20 mb-4 flex justify-between text-sm font-code">
              <span className="text-muted-foreground">Current Price</span>
              <span className="font-bold">₹{fmt(modal.holding.lastPrice)}</span>
            </div>

            {/* Order Type */}
            <div className="mb-4">
              <label className="text-xs text-muted-foreground block mb-2">Order Type</label>
              <div className="flex gap-2">
                {(['MARKET', 'LIMIT'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setOrderType(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      orderType === t
                        ? 'bg-accent text-accent-foreground border-accent'
                        : 'bg-muted/20 border-border/20 text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="mb-4">
              <label className="text-xs text-muted-foreground block mb-2">Quantity</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setOrderQty(q => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-lg bg-muted/30 hover:bg-muted/50 text-lg font-bold flex items-center justify-center"
                >−</button>
                <input
                  type="number"
                  min={1}
                  value={orderQty}
                  onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 text-center bg-muted/20 border border-border/20 rounded-lg py-2 font-code text-lg font-bold focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <button
                  onClick={() => setOrderQty(q => q + 1)}
                  className="w-9 h-9 rounded-lg bg-muted/30 hover:bg-muted/50 text-lg font-bold flex items-center justify-center"
                >+</button>
              </div>
            </div>

            {/* Limit Price (only if LIMIT) */}
            {orderType === 'LIMIT' && (
              <div className="mb-4">
                <label className="text-xs text-muted-foreground block mb-2">Limit Price (₹)</label>
                <input
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="w-full bg-muted/20 border border-border/20 rounded-lg py-2 px-3 font-code focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            )}

            {/* Order Summary */}
            <div className="p-3 rounded-lg bg-muted/10 border border-border/10 mb-5 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">Est. Value</span>
                <span className="font-code font-bold">
                  ₹{fmt(orderQty * (orderType === 'LIMIT' ? parseFloat(limitPrice) || modal.holding.lastPrice : modal.holding.lastPrice))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product</span>
                <span className="font-code">CNC (Delivery)</span>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 mb-5 text-xs text-amber-300">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>This will place a real order on Zerodha. Please confirm the details before proceeding.</span>
            </div>

            {/* Confirm Button */}
            <Button
              onClick={confirmOrder}
              disabled={placing}
              className={`w-full gap-2 font-semibold ${
                modal.side === 'BUY'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {placing ? (
                <><div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Placing Order...</>
              ) : (
                <>{modal.side === 'BUY' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  Confirm {modal.side} · {orderQty} × {modal.holding.tradingsymbol}</>
              )}
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
