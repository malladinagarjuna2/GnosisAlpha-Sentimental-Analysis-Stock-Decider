'use client';

import { Alert } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle } from 'lucide-react';

export const AlertCard = ({ alert }: { alert: Alert }) => {
  const metadata = alert.metadata;
  const isHighImpact = metadata.impactScore > 70;

  return (
    <div className="p-4 hover:bg-card/60 transition-colors border-b border-border/20 last:border-0">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg flex-shrink-0 ${
          isHighImpact
            ? 'bg-red-500/10 text-red-500'
            : 'bg-yellow-500/10 text-yellow-500'
        }`}>
          {isHighImpact ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground mb-1">
            {alert.message.split('—')[0].trim()}
          </p>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {metadata.category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Impact: {metadata.impactScore}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(alert.createdAt).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
};
