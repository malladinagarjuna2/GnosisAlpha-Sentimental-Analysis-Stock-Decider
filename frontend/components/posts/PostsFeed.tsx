'use client';

import { Post } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PostItem } from './PostItem';

interface PostsFeedProps {
  posts?: Post[];
  loading?: boolean;
}

export const PostsFeed = ({ posts, loading }: PostsFeedProps) => {
  return (
    <Card className="border-border/20 bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="divide-y divide-border/20">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          posts.map((post) => <PostItem key={post.id} post={post} />)
        ) : (
          <div className="p-12 text-center">
            <p className="text-muted-foreground mb-2">No posts found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
