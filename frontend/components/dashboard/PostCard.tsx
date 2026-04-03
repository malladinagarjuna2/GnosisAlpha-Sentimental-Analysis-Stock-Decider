'use client';

import { Post } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

export const PostCard = ({ post }: { post: Post }) => {
  const sentiment = post.sentiment;
  const isPositive = (sentiment?.sentimentScore || 0) > 0.5;
  const isWhaleAlert = sentiment?.isWhaleAlert;

  return (
    <div className="p-6 hover:bg-card/60 transition-colors border-b border-border/20 last:border-0">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-foreground truncate">
              {post.author}
            </span>
            <Badge variant="secondary" className="text-xs">
              {post.source}
            </Badge>
            {isWhaleAlert && (
              <Badge className="bg-yellow-500/20 text-yellow-200 text-xs">
                Whale
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground/80 line-clamp-2 mb-2">
            {post.content}
          </p>
        </div>

        {sentiment && (
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">
                {(sentiment.sentimentScore * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">
                Impact: {sentiment.impactScore}
              </p>
            </div>
            <div
              className={`p-2 rounded-lg ${
                isPositive
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-red-500/10 text-red-500'
              }`}
            >
              {isPositive ? (
                <ThumbsUp className="h-4 w-4" />
              ) : (
                <ThumbsDown className="h-4 w-4" />
              )}
            </div>
          </div>
        )}
      </div>

      {sentiment && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            {sentiment.category}
          </Badge>
          <span>{sentiment.reason}</span>
        </div>
      )}
    </div>
  );
};
