'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Post } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, ExternalLink } from 'lucide-react';

export const PostItem = ({ post }: { post: Post }) => {
  const sentiment = post.sentiment;
  const isPositive = (sentiment?.sentimentScore || 0) > 0.5;
  const isWhaleAlert = sentiment?.isWhaleAlert;

  return (
    <div className="p-6 hover:bg-card/60 transition-colors border-b border-border/20 last:border-0">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="font-medium text-foreground truncate">
                @{post.author}
              </span>
              <Badge variant="secondary" className="text-xs">
                {post.source}
              </Badge>
              {isWhaleAlert && (
                <Badge className="bg-yellow-500/20 text-yellow-200 text-xs">
                  Whale Alert
                </Badge>
              )}
            </div>

            {post.asset && (
              <Badge variant="outline" className="text-xs mb-3">
                {post.asset.symbol}
              </Badge>
            )}

            <p className="text-sm text-foreground/80 leading-relaxed mb-3">
              {post.content}
            </p>

            <p className="text-xs text-muted-foreground">
              {new Date(post.postedAt).toLocaleString()}
            </p>
          </div>

          {sentiment && (
            <div className="flex-shrink-0 text-right">
              <div
                className={`p-3 rounded-lg ${
                  isPositive
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-red-500/10 text-red-500'
                }`}
              >
                {isPositive ? (
                  <ThumbsUp className="h-5 w-5" />
                ) : (
                  <ThumbsDown className="h-5 w-5" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sentiment Stats */}
        {sentiment && (
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/10">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Sentiment</p>
              <p className="text-sm font-semibold text-foreground">
                {(sentiment.sentimentScore * 100).toFixed(0)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Impact</p>
              <p className="text-sm font-semibold text-foreground">
                {sentiment.impactScore}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Confidence</p>
              <p className="text-sm font-semibold text-foreground">
                {(sentiment.confidence * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        )}

        {/* Category & Reason */}
        {sentiment && (
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="outline" className="text-xs">
              {sentiment.category}
            </Badge>
            <p className="text-xs text-muted-foreground">{sentiment.reason}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Link href={`/dashboard/posts/${post.id}`}>
            <Button variant="outline" size="sm" className="text-xs">
              View Details
            </Button>
          </Link>
          {post.url && (
            <a href={post.url} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="text-xs">
                <ExternalLink className="h-3 w-3 mr-1" />
                Source
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
