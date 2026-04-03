'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { channelsAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Twitter, MessageCircle } from 'lucide-react';

export default function ChannelsPage() {
  const { toast } = useToast();
  const { data: channelsData, loading, refetch } = useFetch(() =>
    channelsAPI.getAll()
  );

  const { data: followedChannels } = useFetch(() =>
    channelsAPI.getFollowed()
  );

  const [newHandle, setNewHandle] = useState('');
  const [newPlatform, setNewPlatform] = useState<'TWITTER' | 'REDDIT'>('TWITTER');
  const [isAdding, setIsAdding] = useState(false);

  const allChannels = [
    ...(channelsData?.defaults || []),
    ...(channelsData?.custom || []),
  ];

  const followedIds = new Set(followedChannels?.map((c) => c.id) || []);

  const handleFollow = async (channelId: string) => {
    try {
      await channelsAPI.follow(channelId);
      await refetch();
      toast({
        title: 'Success',
        description: 'Channel followed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description:
          error?.response?.data?.message?.message ||
          'Failed to follow channel',
        variant: 'destructive',
      });
    }
  };

  const handleUnfollow = async (channelId: string) => {
    try {
      await channelsAPI.unfollow(channelId);
      await refetch();
      toast({
        title: 'Success',
        description: 'Channel unfollowed',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to unfollow channel',
        variant: 'destructive',
      });
    }
  };

  const handleAddCustom = async () => {
    if (!newHandle.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a handle',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsAdding(true);
      await channelsAPI.createCustom(newPlatform, newHandle);
      setNewHandle('');
      await refetch();
      toast({
        title: 'Success',
        description: 'Custom channel added and followed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description:
          error?.response?.data?.message?.message ||
          'Failed to add channel',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Social Media Channels
        </h1>
        <p className="text-muted-foreground">
          Follow channels to get sentiment data from specific sources. Max 15 channels.
        </p>
      </div>

      {/* Add Custom Channel */}
      <Card className="p-6 border-border/20 bg-card/50 backdrop-blur-sm">
        <h2 className="text-lg font-bold text-foreground mb-4">
          Add Custom Channel
        </h2>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={newPlatform}
              onChange={(e) =>
                setNewPlatform(e.target.value as 'TWITTER' | 'REDDIT')
              }
              className="px-4 py-2 rounded-lg bg-input border border-border text-foreground"
            >
              <option value="TWITTER">Twitter</option>
              <option value="REDDIT">Reddit</option>
            </select>
            <Input
              placeholder="Enter handle (without @ or u/)"
              value={newHandle}
              onChange={(e) => setNewHandle(e.target.value)}
              disabled={isAdding}
            />
            <Button
              onClick={handleAddCustom}
              disabled={isAdding}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isAdding ? 'Adding...' : 'Add Channel'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Followed Channels */}
      {followedChannels && followedChannels.length > 0 && (
        <Card className="p-6 border-border/20 bg-card/50 backdrop-blur-sm">
          <h2 className="text-lg font-bold text-foreground mb-4">
            Followed Channels ({followedChannels.length}/15)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {followedChannels.map((channel) => (
              <div
                key={channel.id}
                className="p-4 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {channel.platform === 'TWITTER' ? (
                    <Twitter className="h-5 w-5 text-blue-500" />
                  ) : (
                    <MessageCircle className="h-5 w-5 text-orange-500" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">
                      {channel.displayName || channel.handle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      @{channel.handle}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnfollow(channel.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* All Available Channels */}
      <Card className="p-6 border-border/20 bg-card/50 backdrop-blur-sm">
        <h2 className="text-lg font-bold text-foreground mb-4">
          Available Channels
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : allChannels.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allChannels.map((channel) => {
              const isFollowed = followedIds.has(channel.id);
              return (
                <div
                  key={channel.id}
                  className="p-4 rounded-lg border border-border/20 bg-card/30 hover:bg-card/60 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {channel.platform === 'TWITTER' ? (
                      <Twitter className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    ) : (
                      <MessageCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {channel.displayName || channel.handle}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{channel.handle}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={isFollowed ? 'outline' : 'default'}
                    size="sm"
                    onClick={() =>
                      isFollowed
                        ? handleUnfollow(channel.id)
                        : handleFollow(channel.id)
                    }
                    className={`flex-shrink-0 ${
                      isFollowed
                        ? 'border-accent text-accent'
                        : 'bg-accent hover:bg-accent/90 text-accent-foreground'
                    }`}
                  >
                    {isFollowed ? 'Following' : 'Follow'}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No channels available
          </p>
        )}
      </Card>
    </div>
  );
}
