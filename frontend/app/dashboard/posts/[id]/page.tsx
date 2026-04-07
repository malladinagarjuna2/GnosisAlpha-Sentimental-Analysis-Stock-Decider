'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFetch } from '@/hooks/useFetch';
import { postsAPI, analysisAPI, strategiesAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, ThumbsUp, ThumbsDown, Zap, ExternalLink, Sparkles, Shield, Scale, Flame, CheckCircle2, Brain, Users, ArrowUpRight, ArrowDownRight, Minus, ShoppingCart, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { GeneratedStrategy, MultiAgentAnalysis } from '@/lib/types';
import { zerodhaAPI } from '@/lib/api';

export default function PostDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const { data: post, loading: postLoading } = useFetch(
    () => postsAPI.getOne(postId),
    [postId]
  );

  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [multiAgentResult, setMultiAgentResult] = useState<MultiAgentAnalysis | null>(null);
  const [isMultiAgentAnalyzing, setIsMultiAgentAnalyzing] = useState(false);

  const [strategies, setStrategies] = useState<GeneratedStrategy[]>([]);
  const [isGeneratingStrategies, setIsGeneratingStrategies] = useState(false);
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);

  const [tradeModal, setTradeModal] = useState<{ symbol: string; side: 'BUY' | 'SELL' } | null>(null);
  const [tradeQty, setTradeQty] = useState(1);
  const [tradeOrderType, setTradeOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [tradePrice, setTradePrice] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const handleRunAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      const response = await analysisAPI.deep(postId);
      setAnalysis(response.data);
      toast.success('Deep analysis has been generated');
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Could not generate deep analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRunMultiAgent = async () => {
    try {
      setIsMultiAgentAnalyzing(true);
      setMultiAgentResult(null);
      const response = await analysisAPI.multiAgent(postId);
      setMultiAgentResult(response.data);
      toast.success('Multi-agent analysis complete');
    } catch (error) {
      console.error('Multi-agent analysis failed:', error);
      toast.error('Could not run multi-agent analysis');
    } finally {
      setIsMultiAgentAnalyzing(false);
    }
  };

  const handleGenerateStrategies = async () => {
    if (!analysis) return;
    setIsGeneratingStrategies(true);
    setStrategies([]);
    setAppliedIndex(null);
    try {
      const res = await strategiesAPI.generateFromPost(postId, analysis);
      const data = Array.isArray(res.data) ? res.data : [];
      if (data.length === 0) {
        toast.error('No strategies were generated. Set up your investor profile first.');
        return;
      }
      setStrategies(data);
      toast.success(`${data.length} strategies generated from this analysis`);
    } catch (err: any) {
      console.error('Strategy generation failed:', err?.response?.data || err);
      toast.error(err?.response?.data?.message || 'Could not generate strategies from this post');
    } finally {
      setIsGeneratingStrategies(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!tradeModal) return;
    setIsPlacingOrder(true);
    try {
      await zerodhaAPI.placeOrder({
        tradingsymbol: tradeModal.symbol,
        exchange: 'NSE',
        side: tradeModal.side,
        quantity: tradeQty,
        orderType: tradeOrderType,
        price: tradeOrderType === 'LIMIT' ? parseFloat(tradePrice) : undefined,
        postId,
      });
      toast.success(`${tradeModal.side} order placed for ${tradeModal.symbol}`);
      setTradeModal(null);
      setTradeQty(1);
      setTradePrice('');
      setTradeOrderType('MARKET');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Order failed');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleApplyStrategy = async (strat: GeneratedStrategy, index: number) => {
    try {
      await strategiesAPI.update(strat.config);
      setAppliedIndex(index);
      toast.success(`"${strat.name}" is now your active strategy!`);
    } catch {
      toast.error('Could not apply strategy');
    }
  };

  const RISK_ICONS: Record<string, React.ElementType> = { LOW: Shield, MEDIUM: Scale, HIGH: Flame };
  const RISK_COLORS: Record<string, { text: string; bg: string; border: string }> = {
    LOW:    { text: 'text-blue-400',  bg: 'bg-blue-500/10',  border: 'border-blue-500/20' },
    MEDIUM: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    HIGH:   { text: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/20' },
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

              <time
                dateTime={post.postedAt}
                className="text-sm text-muted-foreground"
                suppressHydrationWarning
              >
                Posted: {new Date(post.postedAt).toLocaleString()}
              </time>
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

        {/* Analysis Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing || isMultiAgentAnalyzing}
            className="h-auto py-4 flex flex-col gap-1 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Zap className={`h-5 w-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span className="font-semibold">{isAnalyzing ? 'Analyzing...' : 'Deep LLM Analysis'}</span>
            <span className="text-xs opacity-70">Single GPT-4o-mini deep dive</span>
          </Button>

          <Button
            onClick={handleRunMultiAgent}
            disabled={isMultiAgentAnalyzing || isAnalyzing}
            className="h-auto py-4 flex flex-col gap-1 bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Users className={`h-5 w-5 ${isMultiAgentAnalyzing ? 'animate-spin' : ''}`} />
            <span className="font-semibold">{isMultiAgentAnalyzing ? 'Running Agents...' : 'Multi-Agent Analysis'}</span>
            <span className="text-xs opacity-70">All registered agents + consensus</span>
          </Button>
        </div>

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

            <time
              dateTime={analysis.analyzedAt}
              className="text-xs text-muted-foreground pt-4 border-t border-border/20 block"
              suppressHydrationWarning
            >
              Analyzed at: {new Date(analysis.analyzedAt).toLocaleString()}
            </time>

            {/* Trade This Stock */}
            {post?.asset && (
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => { setTradeModal({ symbol: post.asset!.symbol, side: 'BUY' }); setTradeQty(1); setTradeOrderType('MARKET'); setTradePrice(''); }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                >
                  <ShoppingCart className="h-4 w-4" /> Buy {post.asset.symbol}
                </Button>
                <Button
                  onClick={() => { setTradeModal({ symbol: post.asset!.symbol, side: 'SELL' }); setTradeQty(1); setTradeOrderType('MARKET'); setTradePrice(''); }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
                >
                  <ShoppingCart className="h-4 w-4" /> Sell {post.asset.symbol}
                </Button>
              </div>
            )}

            {/* Generate Strategy Button — appears after analysis */}
            <Button
              onClick={handleGenerateStrategies}
              disabled={isGeneratingStrategies}
              className="w-full mt-6 bg-violet-600 hover:bg-violet-700 text-white gap-2"
              size="lg"
            >
              {isGeneratingStrategies ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Generating Strategies...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generate Strategy from This Analysis
                </>
              )}
            </Button>
          </div>
        )}

        {/* Multi-Agent Pipeline Results */}
        {multiAgentResult && (
          <div className="space-y-6 mb-8">

            {/* Header + top-level verdict */}
            <div className="p-6 rounded-lg bg-card/50 border border-violet-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-violet-400" />
                  <h3 className="text-lg font-bold text-foreground">Multi-Agent Analysis</h3>
                  <Badge variant="outline" className={`font-code text-xs ${
                    multiAgentResult.pipelineStatus === 'full' ? 'text-green-400 border-green-500/30' :
                    multiAgentResult.pipelineStatus === 'partial' ? 'text-amber-400 border-amber-500/30' :
                    'text-muted-foreground'
                  }`}>
                    {multiAgentResult.pipelineStatus}
                  </Badge>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-bold text-sm ${
                  multiAgentResult.sentiment === 'BULLISH' ? 'bg-green-500/20 text-green-400' :
                  multiAgentResult.sentiment === 'BEARISH' ? 'bg-red-500/20 text-red-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {multiAgentResult.sentiment === 'BULLISH' && <ArrowUpRight className="h-4 w-4" />}
                  {multiAgentResult.sentiment === 'BEARISH' && <ArrowDownRight className="h-4 w-4" />}
                  {multiAgentResult.sentiment === 'NEUTRAL' && <Minus className="h-4 w-4" />}
                  {multiAgentResult.sentiment}
                </div>
              </div>

              <p className="text-foreground/80 mb-4">{multiAgentResult.summary}</p>
              <p className="text-sm text-muted-foreground mb-4">{multiAgentResult.reasoning}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-muted/20 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Risk Level</p>
                  <p className={`font-bold font-code ${
                    multiAgentResult.riskLevel === 'HIGH' ? 'text-red-400' :
                    multiAgentResult.riskLevel === 'MEDIUM' ? 'text-amber-400' : 'text-green-400'
                  }`}>{multiAgentResult.riskLevel}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                  <p className="font-bold font-code">{(multiAgentResult.confidenceScore * 100).toFixed(0)}%</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Sentiment Score</p>
                  <p className="font-bold font-code">{multiAgentResult.sentimentScore.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Verified</p>
                  <p className={`font-bold font-code ${multiAgentResult.security.verified ? 'text-green-400' : 'text-red-400'}`}>
                    {multiAgentResult.security.verified ? 'YES' : 'NO'}
                  </p>
                </div>
              </div>

              {multiAgentResult.keyThemes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {multiAgentResult.keyThemes.map((t, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>
              )}

              <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <p className="text-xs font-semibold text-amber-400 mb-1">Recommendation</p>
                <p className="text-sm text-foreground/80">{multiAgentResult.recommendation}</p>
              </div>
            </div>

            {/* Agent Trace */}
            <div className="p-6 rounded-lg bg-card/50 border border-border/20">
              <h4 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                <Brain className="h-4 w-4" /> Agent Trace
              </h4>
              <div className="space-y-3">

                {/* Agent 1 */}
                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/15">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-blue-400">Agent 1 — Sentiment (Gemini)</span>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs font-code">{multiAgentResult.agentTrace.agent1.asset}</Badge>
                      <Badge variant="outline" className="text-xs">{multiAgentResult.agentTrace.agent1.tweetType}</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-2 text-xs font-code">
                    <div><span className="text-muted-foreground">Sentiment: </span>{multiAgentResult.agentTrace.agent1.sentimentScore.toFixed(2)}</div>
                    <div><span className="text-muted-foreground">Relevance: </span>{(multiAgentResult.agentTrace.agent1.relevanceScore * 100).toFixed(0)}%</div>
                    <div><span className="text-muted-foreground">Confidence: </span>{(multiAgentResult.agentTrace.agent1.confidence * 100).toFixed(0)}%</div>
                  </div>
                  {multiAgentResult.agentTrace.agent1.matchedKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {multiAgentResult.agentTrace.agent1.matchedKeywords.map((kw, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 font-code">{kw}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Agent 2 */}
                <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/15">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-orange-400">Agent 2 — Risk (OpenAI)</span>
                    <Badge className={`text-xs ${
                      multiAgentResult.agentTrace.agent2.riskLevel === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                      multiAgentResult.agentTrace.agent2.riskLevel === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>{multiAgentResult.agentTrace.agent2.riskLevel}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-code mb-2">
                    <div><span className="text-muted-foreground">Confidence: </span>{(multiAgentResult.agentTrace.agent2.adjustedConfidence * 100).toFixed(0)}%</div>
                    <div><span className="text-muted-foreground">Pump&Dump: </span>
                      <span className={multiAgentResult.agentTrace.agent2.pumpAndDumpSignals ? 'text-red-400' : 'text-green-400'}>
                        {multiAgentResult.agentTrace.agent2.pumpAndDumpSignals ? 'YES' : 'NO'}
                      </span>
                    </div>
                    <div><span className="text-muted-foreground">Sarcasm: </span>{multiAgentResult.agentTrace.agent2.sarcasmDetected ? 'YES' : 'NO'}</div>
                    <div><span className="text-muted-foreground">Manipulation: </span>{multiAgentResult.agentTrace.agent2.emotionalManipulation ? 'YES' : 'NO'}</div>
                  </div>
                  {multiAgentResult.agentTrace.agent2.riskFlags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {multiAgentResult.agentTrace.agent2.riskFlags.map((f, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 font-code">{f}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Agent 3 */}
                <div className={`p-4 rounded-lg border ${
                  multiAgentResult.agentTrace.agent3.summary.startsWith('Analysis blocked')
                    ? 'bg-red-500/5 border-red-500/15'
                    : 'bg-green-500/5 border-green-500/15'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-bold ${
                      multiAgentResult.agentTrace.agent3.summary.startsWith('Analysis blocked') ? 'text-red-400' : 'text-green-400'
                    }`}>
                      Agent 3 — Explanation (Gemini)
                      {multiAgentResult.agentTrace.agent3.summary.startsWith('Analysis blocked') && (
                        <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-red-500/20">BLOCKED</span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/80 mb-2">{multiAgentResult.agentTrace.agent3.summary}</p>
                  <p className="text-xs text-muted-foreground mb-2">{multiAgentResult.agentTrace.agent3.reasoning}</p>
                  {multiAgentResult.agentTrace.agent3.keySignals.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {multiAgentResult.agentTrace.agent3.keySignals.map((s, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted/30 text-muted-foreground font-code">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ArmorIQ Security Block */}
            <div className="p-6 rounded-lg bg-card/50 border border-border/20">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-violet-400" /> ArmorIQ Security
                </h4>
                <div className="flex gap-2">
                  <Badge className={`text-xs ${multiAgentResult.security.verified ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {multiAgentResult.security.verified ? '✓ Verified' : '✗ Unverified'}
                  </Badge>
                  <Badge className={`text-xs ${
                    multiAgentResult.security.confidenceLevel === 'high' ? 'bg-green-500/20 text-green-400' :
                    multiAgentResult.security.confidenceLevel === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>{multiAgentResult.security.confidenceLevel} confidence</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs font-code">
                <div className="p-2 rounded bg-muted/20">
                  <p className="text-muted-foreground mb-1">Reasoning Score</p>
                  <p className="font-bold">{multiAgentResult.security.reasoningScore.toFixed(2)}</p>
                </div>
                <div className="p-2 rounded bg-muted/20">
                  <p className="text-muted-foreground mb-1">Hallucination</p>
                  <p className={`font-bold ${multiAgentResult.security.hallucination ? 'text-red-400' : 'text-green-400'}`}>
                    {multiAgentResult.security.hallucination ? 'YES' : 'NO'}
                  </p>
                </div>
                <div className="p-2 rounded bg-muted/20">
                  <p className="text-muted-foreground mb-1">Plan Validated</p>
                  <p className={`font-bold ${multiAgentResult.security.planValidated ? 'text-green-400' : 'text-muted-foreground'}`}>
                    {multiAgentResult.security.planValidated ? 'YES' : 'NO'}
                  </p>
                </div>
                <div className="p-2 rounded bg-muted/20">
                  <p className="text-muted-foreground mb-1">Degraded</p>
                  <p className={`font-bold ${multiAgentResult.security.degraded ? 'text-amber-400' : 'text-green-400'}`}>
                    {multiAgentResult.security.degraded ? 'YES' : 'NO'}
                  </p>
                </div>
              </div>

              {multiAgentResult.security.consistencyFlags.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Consistency Flags</p>
                  <div className="space-y-1">
                    {multiAgentResult.security.consistencyFlags.map((f, i) => (
                      <p key={i} className="text-xs text-amber-300 flex items-start gap-1">
                        <span className="mt-0.5">⚠</span> {f}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Policy Decisions */}
              {multiAgentResult.security.policyDecisions.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Policy Decisions</p>
                  <div className="space-y-1">
                    {multiAgentResult.security.policyDecisions.map((pd, i) => (
                      <div key={i} className="flex items-center justify-between text-xs font-code p-2 rounded bg-muted/10">
                        <span>{pd.agentName}</span>
                        <span className="text-muted-foreground flex-1 mx-3 truncate">{pd.reason}</span>
                        <Badge className={`text-xs ${pd.decision === 'allowed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {pd.decision}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audit Trail */}
              {multiAgentResult.security.auditTrail.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Audit Trail</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {multiAgentResult.security.auditTrail.map((e, i) => (
                      <div key={i} className="flex items-center justify-between text-xs font-code p-1.5 rounded bg-muted/10">
                        <span className="text-foreground/70">{e.action}</span>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${
                            e.result === 'allowed' ? 'bg-green-500/20 text-green-400' :
                            e.result === 'blocked' ? 'bg-red-500/20 text-red-400' :
                            'bg-muted/30 text-muted-foreground'
                          }`}>{e.result}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {multiAgentResult.security.intentTokenId && (
                <p className="text-xs text-muted-foreground mt-3 font-code truncate">
                  Token: {multiAgentResult.security.intentTokenId}
                </p>
              )}

              <time dateTime={multiAgentResult.analyzedAt} className="text-xs text-muted-foreground mt-2 block" suppressHydrationWarning>
                Analyzed at: {new Date(multiAgentResult.analyzedAt).toLocaleString()}
              </time>
            </div>
          </div>
        )}

        {/* Strategy Cards — shown after generation */}
        {strategies.length > 0 && (
          <div className="mt-8 space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-400" />
              AI-Generated Strategies
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Based on this post&apos;s deep analysis and your investor profile
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {strategies.map((strat, i) => {
                const RiskIcon = RISK_ICONS[strat.riskLevel] ?? Scale;
                const colors = RISK_COLORS[strat.riskLevel] ?? RISK_COLORS.MEDIUM;
                const isApplied = appliedIndex === i;

                return (
                  <Card
                    key={i}
                    className={`p-5 border-2 ${colors.border} bg-card/50 backdrop-blur-sm flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-lg`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-xl ${colors.bg}`}>
                        <RiskIcon className={`h-5 w-5 ${colors.text}`} />
                      </div>
                      <Badge variant="outline" className="font-code text-xs">
                        Win: {strat.estimatedWinRate}
                      </Badge>
                    </div>

                    <h4 className="text-base font-bold mb-1">{strat.name}</h4>
                    <p className="text-xs text-muted-foreground mb-3 flex-1 leading-relaxed">
                      {strat.description}
                    </p>

                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit mb-2 ${colors.bg} ${colors.text}`}>
                      {strat.riskLevel} RISK
                    </span>

                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {strat.rationale}
                    </p>

                    <div className="mt-auto pt-3 border-t border-border/10 space-y-1 font-code text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Sentiment</span>
                        <span className="text-foreground">{strat.config?.sentimentThreshold ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Impact</span>
                        <span className="text-foreground">{strat.config?.impactThreshold ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Confidence</span>
                        <span className="text-foreground">{strat.config?.confidenceThreshold ?? '—'}</span>
                      </div>
                    </div>

                    <Button
                      variant={isApplied ? 'default' : 'outline'}
                      className="mt-3 w-full gap-2"
                      size="sm"
                      onClick={() => handleApplyStrategy(strat, i)}
                      disabled={isApplied}
                    >
                      {isApplied ? (
                        <><CheckCircle2 className="h-4 w-4" /> Applied</>
                      ) : (
                        <><Zap className="h-4 w-4" /> Apply Strategy</>
                      )}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Trade Confirmation Modal */}
      {tradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 border-border/20 bg-card space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                <span className={tradeModal.side === 'BUY' ? 'text-green-400' : 'text-red-400'}>{tradeModal.side}</span>
                {' '}{tradeModal.symbol}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setTradeModal(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Order Type */}
            <div className="flex gap-2">
              {(['MARKET', 'LIMIT'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTradeOrderType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    tradeOrderType === t ? 'bg-accent text-accent-foreground' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                  }`}
                >{t}</button>
              ))}
            </div>

            {/* Quantity */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Quantity</p>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setTradeQty(q => Math.max(1, q - 1))}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-12 text-center font-bold font-code">{tradeQty}</span>
                <Button variant="outline" size="sm" onClick={() => setTradeQty(q => q + 1)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Limit Price */}
            {tradeOrderType === 'LIMIT' && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Limit Price (₹)</p>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={tradePrice}
                  onChange={e => setTradePrice(e.target.value)}
                  className="font-code"
                />
              </div>
            )}

            {/* Warning */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-400 font-semibold">⚠ Real order — this will execute on your Zerodha account</p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setTradeModal(null)}>Cancel</Button>
              <Button
                className={`flex-1 text-white ${tradeModal.side === 'BUY' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || (tradeOrderType === 'LIMIT' && !tradePrice)}
              >
                {isPlacingOrder ? 'Placing...' : `Confirm ${tradeModal.side}`}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
