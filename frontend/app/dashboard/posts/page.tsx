'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { postsAPI, assetsAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PostsFeed } from '@/components/posts/PostsFeed';
import { Filter } from 'lucide-react';

export default function PostsPage() {
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('');

  const { data: assets } = useFetch(() => assetsAPI.getAll());

  const params: any = { limit: 50 };
  if (selectedAsset) params.assetId = selectedAsset;
  if (selectedSource) params.source = selectedSource;

  const { data: posts, loading: postsLoading } = useFetch(
    () => postsAPI.getAll(params),
    [selectedAsset, selectedSource]
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Market Posts</h1>
        <p className="text-muted-foreground">
          Real-time sentiment data from Twitter and Reddit.
        </p>
      </div>

      {/* Filters */}
      <Card className="p-6 border-border/20 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Filter by:</span>
          </div>

          <Select value={selectedAsset} onValueChange={setSelectedAsset}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Assets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Assets</SelectItem>
              {assets?.map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.symbol} - {asset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Sources</SelectItem>
              <SelectItem value="TWITTER">Twitter</SelectItem>
              <SelectItem value="REDDIT">Reddit</SelectItem>
            </SelectContent>
          </Select>

          {(selectedAsset || selectedSource) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedAsset('');
                setSelectedSource('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      {/* Posts Feed */}
      <PostsFeed posts={posts} loading={postsLoading} />
    </div>
  );
}
