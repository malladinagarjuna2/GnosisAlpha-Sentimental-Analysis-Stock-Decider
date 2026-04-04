'use client';

import { useFetch } from '@/hooks/useFetch';
import { alertsAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle as AlertIcon, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AlertsPage() {
  const { data: alerts, loading: alertsLoading } = useFetch(() =>
    alertsAPI.getAll()
  );

  const sortedAlerts = alerts
    ? [...alerts].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    : [];

  const highImpactAlerts = sortedAlerts.filter(
    (a) => (a.metadata?.impactScore || 0) > 70
  );
  const lowImpactAlerts = sortedAlerts.filter(
    (a) => (a.metadata?.impactScore || 0) <= 70
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Alerts</h1>
        <p className="text-muted-foreground">
          Real-time notifications for market sentiment changes.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-border/20 bg-card/50 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground mb-2">Total Alerts</p>
          <p className="text-2xl font-bold text-foreground">
            {alertsLoading ? <Skeleton className="w-12 h-8" /> : sortedAlerts.length}
          </p>
        </Card>

        <Card className="p-6 border-border/20 bg-card/50 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground mb-2">High Impact</p>
          <p className="text-2xl font-bold text-red-500">
            {alertsLoading ? <Skeleton className="w-12 h-8" /> : highImpactAlerts.length}
          </p>
        </Card>

        <Card className="p-6 border-border/20 bg-card/50 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground mb-2">Low Impact</p>
          <p className="text-2xl font-bold text-yellow-500">
            {alertsLoading ? <Skeleton className="w-12 h-8" /> : lowImpactAlerts.length}
          </p>
        </Card>
      </div>

      {/* High Impact Alerts */}
      {highImpactAlerts.length > 0 && (
        <Card className="border-border/20 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="p-6 border-b border-border/20 bg-red-500/5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-bold text-foreground">High Impact Alerts</h2>
            </div>
          </div>
          <div className="divide-y divide-border/20">
            {highImpactAlerts.map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
          </div>
        </Card>
      )}

      {/* All Alerts */}
      <Card className="border-border/20 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="p-6 border-b border-border/20">
          <div className="flex items-center gap-2">
            <AlertIcon className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-bold text-foreground">All Alerts</h2>
          </div>
        </div>
        <div className="divide-y divide-border/20">
          {alertsLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : sortedAlerts.length > 0 ? (
            sortedAlerts.map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              No alerts yet. Enable alerts on tracked assets to get notifications.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function AlertItem({ alert }: { alert: any }) {
  const metadata = alert.metadata;
  const isHighImpact = metadata.impactScore > 70;

  return (
    <div className="p-6 hover:bg-card/60 transition-colors">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg flex-shrink-0 ${
          isHighImpact
            ? 'bg-red-500/10 text-red-500'
            : 'bg-yellow-500/10 text-yellow-500'
        }`}>
          {isHighImpact ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <AlertIcon className="h-5 w-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground mb-2">
            {alert.message.split('—')[0].trim()}
          </p>

          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Sentiment</p>
              <p className="text-sm font-semibold text-foreground">
                {(metadata.sentimentScore * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Impact</p>
              <p className="text-sm font-semibold text-foreground">
                {metadata.impactScore}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Category</p>
              <Badge variant="outline" className="text-xs">
                {metadata.category}
              </Badge>
            </div>
          </div>

          <time
            dateTime={alert.createdAt}
            className="text-xs text-muted-foreground"
            suppressHydrationWarning
          >
            {new Date(alert.createdAt).toLocaleString()}
          </time>
        </div>
      </div>
    </div>
  );
}
