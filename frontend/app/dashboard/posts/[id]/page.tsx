'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFetch } from '@/hooks/useFetch';
import { postsAPI, analysisAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ThumbsUp, ThumbsDown, Zap, ExternalLink } from 'lucide-react';

export default function PostDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const postId = params.id as string;

  const { data: post, loading: postLoading } = useFetch(
    () => postsAPI.getOne(postId),
    [postId]
  );

  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleRunAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      const response = await analysisAPI.deep(postId);
      setAnalysis(response.data);
      toast({
        title: 'Analysis Complete',
        description: 'Deep analysis has been generated',
      });
    } catch (error) {
      toast({
        title: 'Analysis Failed',
        description: 'Could not generate deep analysis',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (postLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-6">
        <Card className="p-12 text-center border-border/20 bg-card/50 backdrop-blur-sm">
          <p className="text-muted-foreground mb-4">Post not found</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </Card>
      </div>
    );
  }

  const sentiment = post.sentiment;
  const isPositive = (sentiment?.sentimentScore || 0) > 0.5;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
      </div>

      {/* Main Post Card */}
      <Card className="p-8 border-border/20 bg-card/50 backdrop-blur-sm">
        {/* Post Header */}
        <div className="mb-6 pb-6 border-b border-border/20">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-bold text-foreground">@{post.author}</span>
                <Badge variant="secondary">{post.source}</Badge>
                {sentiment?.isWhaleAlert && (
                  <Badge className="bg-yellow-500/20 text-yellow-200">
                    Whale Alert
                  </Badge>
                )}
              </div>

              {post.asset && (
                <Badge variant="outline" className="mb-3">
                  {post.asset.symbol} - {post.asset.name}
                </Badge>
              )}

              <p className="text-sm text-muted-foreground">
                Posted: {new Date(post.postedAt).toLocaleString()}
              </p>
            </div>

            {sentiment && (
              <div
                className={`p-4 rounded-lg text-center ${
                  isPositive
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-red-500/10 text-red-500'
                }`}
              >
                {isPositive ? (
                  <ThumbsUp className="h-6 w-6 mx-auto mb-2" />
                ) : (
                  <ThumbsDown className="h-6 w-6 mx-auto mb-2" />
                )}
                <p className="text-sm font-semibold">
                  {(sentiment.sentimentScore * 100).toFixed(0)}%
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Post Content */}
        <div className="mb-8 pb-8 border-b border-border/20">
          <p className="text-lg leading-relaxed text-foreground/90">
            {post.content}
          </p>

          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-accent hover:underline mt-4"
            >
              <ExternalLink className="h-4 w-4" />
              View Original Post
            </a>
          )}
        </div>

        {/* Sentiment Details */}
        {sentiment && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 pb-8 border-b border-border/20">
            <div className="p-4 rounded-lg bg-blue-500/10">
              <p className="text-xs text-muted-foreground mb-2">Sentiment Score</p>
              <p className="text-2xl font-bold text-blue-500">
                {(sentiment.sentimentScore * 100).toFixed(1)}%
              </p>
            </div>

            <div className="p-4 rounded-lg bg-purple-500/10">
              <p className="text-xs text-muted-foreground mb-2">Impact Score</p>
              <p className="text-2xl font-bold text-purple-500">
                {sentiment.impactScore}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-green-500/10">
              <p className="text-xs text-muted-foreground mb-2">Confidence</p>
              <p className="text-2xl font-bold text-green-500">
                {(sentiment.confidence * 100).toFixed(1)}%
              </p>
            </div>

            <div className="p-4 rounded-lg bg-orange-500/10">
              <p className="text-xs text-muted-foreground mb-2">Method</p>
              <p className="text-2xl font-bold text-orange-500">
                {sentiment.analyzedBy}
              </p>
            </div>
          </div>
        )}

        {/* Analysis Info */}
        {sentiment && (
          <div className="mb-8">
            <p className="text-sm font-medium text-foreground mb-2">Category</p>
            <Badge variant="outline" className="mb-4">
              {sentiment.category}
            </Badge>
            <p className="text-sm text-muted-foreground">{sentiment.reason}</p>
          </div>
        )}

        {/* Deep Analysis Button */}
        <Button
          onClick={handleRunAnalysis}
          disabled={isAnalyzing}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mb-8"
        >
          <Zap className="h-4 w-4 mr-2" />
          {isAnalyzing ? 'Analyzing...' : 'Run Deep LLM Analysis'}
        </Button>

        {/* LLM Analysis Results */}
        {analysis && (
          <div className="space-y-6 p-6 rounded-lg bg-card/50 border border-border/20">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-2">Summary</h3>
              <p className="text-foreground/80">{analysis.summary}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                <p className="text-xs text-muted-foreground mb-1">Sentiment</p>
                <p className="font-semibold text-foreground">{analysis.sentiment}</p>
              </div>
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-muted-foreground mb-1">Risk Level</p>
                <p className="font-semibold text-foreground">{analysis.riskLevel}</p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-foreground mb-2">Reasoning</h3>
              <p className="text-foreground/80">{analysis.reasoning}</p>
            </div>

            <div>
              <h3 className="font-bold text-foreground mb-2">Key Themes</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.keyThemes?.map((theme: string, idx: number) => (
                  <Badge key={idx} variant="secondary">
                    {theme}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-foreground mb-2">Recommendation</h3>
              <p className="text-foreground/80">{analysis.recommendation}</p>
            </div>

            <p className="text-xs text-muted-foreground pt-4 border-t border-border/20">
              Analyzed at: {new Date(analysis.analyzedAt).toLocaleString()}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
