'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { assetsAPI, preferencesAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { AssetCard } from '@/components/dashboard/AssetCard';
import { Plus, Search } from 'lucide-react';

export default function AssetsPage() {
  const [search, setSearch] = useState('');
  const { data: allAssets, loading: assetsLoading, refetch: refetchAssets } = useFetch(() =>
    assetsAPI.getAll()
  );

  const { data: trackedAssets, loading: trackedLoading, refetch: refetchTracked } = useFetch(() =>
    preferencesAPI.getAll()
  );

  const trackedIds = new Set(trackedAssets?.map((t) => t.assetId) || []);

  const filtered =
    allAssets?.filter((asset) =>
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      asset.symbol.toLowerCase().includes(search.toLowerCase())
    ) || [];

  const handleToggleTracking = async (assetId: string, isTracked: boolean) => {
    try {
      if (isTracked) {
        await assetsAPI.remove(assetId);
      } else {
        await assetsAPI.add(assetId);
      }
      await refetchTracked();
    } catch (error) {
      console.error('Failed to toggle tracking:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Assets</h1>
        <p className="text-muted-foreground">
          Track cryptocurrencies and stocks to monitor sentiment.
        </p>
      </div>

      <Card className="p-6 border-border/20 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assetsLoading ? (
            <>
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </>
          ) : filtered.length > 0 ? (
            filtered.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                isTracked={trackedIds.has(asset.id)}
                onToggleTracking={(isTracked) =>
                  handleToggleTracking(asset.id, isTracked)
                }
              />
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-muted-foreground">
                {search ? 'No assets found.' : 'No assets available.'}
              </p>
            </div>
          )}
        </div>
      </Card>

      {trackedAssets && trackedAssets.length > 0 && (
        <Card className="p-6 border-border/20 bg-card/50 backdrop-blur-sm">
          <h2 className="text-lg font-bold text-foreground mb-4">
            Tracked ({trackedAssets.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {trackedAssets.map((pref) => (
              <div
                key={pref.id}
                className="p-3 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-between"
              >
                <span className="font-medium text-foreground">
                  {pref.asset.symbol}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleToggleTracking(pref.assetId, true)
                  }
                  className="h-6 w-6 p-0 text-xs"
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
