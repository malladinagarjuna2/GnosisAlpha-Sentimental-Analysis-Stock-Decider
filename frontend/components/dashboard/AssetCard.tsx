'use client';

import { Asset } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Check } from 'lucide-react';
import { useState } from 'react';

interface AssetCardProps {
  asset: Asset;
  isTracked: boolean;
  onToggleTracking: (isTracked: boolean) => Promise<void>;
}

export const AssetCard = ({
  asset,
  isTracked,
  onToggleTracking,
}: AssetCardProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    try {
      setIsLoading(true);
      await onToggleTracking(isTracked);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-4 border-border/20 bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-colors flex flex-col justify-between">
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-lg font-bold text-foreground">{asset.symbol}</p>
            <p className="text-sm text-muted-foreground">{asset.name}</p>
          </div>
          <Badge variant={asset.type === 'CRYPTO' ? 'default' : 'secondary'}>
            {asset.type}
          </Badge>
        </div>
      </div>

      <Button
        onClick={handleClick}
        disabled={isLoading}
        variant={isTracked ? 'outline' : 'default'}
        size="sm"
        className={`w-full ${
          isTracked
            ? 'border-accent text-accent'
            : 'bg-accent hover:bg-accent/90 text-accent-foreground'
        }`}
      >
        {isLoading ? (
          'Loading...'
        ) : isTracked ? (
          <>
            <Check className="h-4 w-4 mr-2" /> Tracked
          </>
        ) : (
          <>
            <Plus className="h-4 w-4 mr-2" /> Track
          </>
        )}
      </Button>
    </Card>
  );
};
