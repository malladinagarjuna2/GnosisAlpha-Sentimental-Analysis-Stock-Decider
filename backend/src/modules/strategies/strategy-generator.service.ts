// src/modules/strategies/strategy-generator.service.ts
// AI Strategy Generator — uses GPT-4o-mini to create personalized strategies
// based on the user's InvestorProfile + recent market sentiment + available agents.
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfileService } from '../profile/profile.service';
import { AgentOrchestratorService } from '../agents/agent-orchestrator.service';
import OpenAI from 'openai';
import type { StrategyConfig } from './dto/strategy-config.interface';
import { DEFAULT_STRATEGY_CONFIG } from './dto/strategy-config.interface';
import { SentimentCategory } from '@prisma/client';

export interface GeneratedStrategy {
  name: string;
  description: string;
  config: StrategyConfig;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedWinRate: string;
  rationale: string;
  agentsUsed: string[];   // which agents this strategy is designed for
}

@Injectable()
export class StrategyGeneratorService {
  private readonly logger = new Logger(StrategyGeneratorService.name);
  private readonly openai: OpenAI | null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly profileService: ProfileService,
    private readonly orchestrator: AgentOrchestratorService,
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (apiKey && apiKey !== 'your_openai_api_key' && !apiKey.startsWith('sk-proj-placeholder')) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.openai = null;
    }
  }

  /**
   * Generate strategies from a specific post's deep analysis result.
   * Flow: Post → Deep Analysis → this method → 3 strategies tailored to the analysis.
   */
  async generateFromPost(
    userId: string,
    postId: string,
    analysis: {
      summary: string;
      sentiment: string;
      reasoning: string;
      keyThemes: string[];
      riskLevel: string;
      recommendation: string;
    },
  ): Promise<GeneratedStrategy[]> {
    // 1. Fetch post + asset from DB
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { asset: true, sentiment: true },
    });
    if (!post) throw new Error(`Post [${postId}] not found`);

    const assetSymbol = post.asset?.symbol ?? 'UNKNOWN';
    const assets = [assetSymbol];

    // 2. Get investor profile
    const profile = await this.profileService.findByUser(userId);
    const risk = profile?.riskTolerance ?? 5;
    const horizon = profile?.horizon ?? 'MEDIUM_TERM';
    const capital = profile?.capitalAmount ?? 100_000;

    // 3. Get healthy agents
    const agentStatus = await this.orchestrator.getAgentStatus();
    const healthyAgents = agentStatus.filter(a => a.healthy).map(a => a.name);

    // 4. Build analysis context string
    const analysisContext = [
      `Deep Analysis Summary: ${analysis.summary}`,
      `LLM Sentiment: ${analysis.sentiment}`,
      `Risk Level: ${analysis.riskLevel}`,
      `Key Themes: ${analysis.keyThemes.join(', ')}`,
      `Reasoning: ${analysis.reasoning}`,
      `Recommendation: ${analysis.recommendation}`,
      post.sentiment
        ? `NLP Score: ${post.sentiment.sentimentScore}, Impact: ${post.sentiment.impactScore}, Category: ${post.sentiment.category}`
        : '',
      `Post Content: "${post.content.slice(0, 300)}"`,
    ].filter(Boolean).join('\n');

    // 5. Generate with LLM or fall back
    if (this.openai) {
      return this.generateFromPostWithLLM(risk, horizon, capital, assets, analysisContext, healthyAgents);
    }
    return this.generateFromPostRuleBased(risk, horizon, capital, assets, analysis, healthyAgents);
  }

  private async generateFromPostWithLLM(
    risk: number,
    horizon: string,
    capital: number,
    assets: string[],
    analysisContext: string,
    healthyAgents: string[],
  ): Promise<GeneratedStrategy[]> {
    const prompt = `You are an Indian stock market strategy advisor. A user has just run a deep AI analysis on a specific social media post about ${assets.join(', ')}. Based on the analysis result and the user's profile, generate 3 actionable trading strategies.

User Profile:
- Risk tolerance: ${risk}/10
- Investment horizon: ${horizon}
- Capital: ₹${capital.toLocaleString('en-IN')}

Post Analysis:
${analysisContext}

Available AI Agents: ${healthyAgents.join(', ')}

Generate 3 strategies (Conservative, Balanced, Aggressive) as JSON array. Each strategy should be DIRECTLY informed by the post analysis — reference the sentiment, themes, and risk from the analysis in your rationale.

[{
  "name": "Strategy Name",
  "description": "1-2 sentence description referencing the analysis findings",
  "riskLevel": "LOW|MEDIUM|HIGH",
  "estimatedWinRate": "65%",
  "rationale": "Why this strategy fits based on the post analysis + user profile",
  "config": {
    "sentimentThreshold": 0.1-0.5,
    "impactThreshold": 30-80,
    "confidenceThreshold": 0.3-0.8,
    "sentimentWeight": 0.3-0.7,
    "impactWeight": 0.3-0.7,
    "keywordsPositive": ["keyword1"],
    "keywordsNegative": ["keyword1"],
    "categories": ["SOCIAL_BUZZ","NEWS","RUMOR","WHALE_ACTIVITY"]
  }
}]

Rules:
- sentimentWeight + impactWeight should sum to 1.0
- Conservative: high thresholds, NEWS+WHALE only
- Balanced: moderate thresholds, all categories
- Aggressive: low thresholds, heavy sentiment weight
- Reference the SPECIFIC analysis findings in rationale and keyword selection
- Tailor keywords to ${assets.join(',')} and the key themes from the analysis

Return ONLY the JSON array, no markdown.`;

    try {
      const completion = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a financial strategy advisor. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 1500,
      });

      const raw = completion.choices[0]?.message?.content ?? '[]';
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array in response');

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((s: any) => ({
        name: s.name ?? 'Unnamed Strategy',
        description: s.description ?? '',
        riskLevel: s.riskLevel ?? 'MEDIUM',
        estimatedWinRate: s.estimatedWinRate ?? '50%',
        rationale: s.rationale ?? '',
        agentsUsed: healthyAgents,
        config: {
          ...DEFAULT_STRATEGY_CONFIG,
          ...s.config,
          categories: (s.config?.categories ?? ['SOCIAL_BUZZ', 'NEWS']).map(
            (c: string) => c as SentimentCategory,
          ),
        },
      }));
    } catch (err) {
      this.logger.error(`❌ LLM post-strategy generation failed: ${(err as Error).message}`);
      return this.generateRuleBased(risk, horizon, capital, assets, healthyAgents);
    }
  }

  private generateFromPostRuleBased(
    risk: number,
    horizon: string,
    capital: number,
    assets: string[],
    analysis: { sentiment: string; keyThemes: string[]; riskLevel: string },
    healthyAgents: string[],
  ): GeneratedStrategy[] {
    const isBullish = analysis.sentiment === 'BULLISH';
    const assetKeywords = assets.map(a => a.toLowerCase());
    const themeKeywords = analysis.keyThemes.map(t => t.toLowerCase());

    return [
      {
        name: isBullish ? 'Cautious Accumulator' : 'Defensive Shield',
        description: `Low-risk strategy for ₹${capital.toLocaleString('en-IN')} based on ${analysis.sentiment} analysis. ${isBullish ? 'Accumulate on confirmed dips.' : 'Protect capital, wait for reversal signals.'}`,
        riskLevel: 'LOW' as const,
        estimatedWinRate: '70%',
        rationale: `Analysis shows ${analysis.sentiment} sentiment with ${analysis.riskLevel} risk. Conservative approach: only act on high-confidence verified news. Themes: ${analysis.keyThemes.join(', ')}.`,
        config: {
          ...DEFAULT_STRATEGY_CONFIG,
          sentimentThreshold: 0.4,
          impactThreshold: 75,
          confidenceThreshold: 0.7,
          sentimentWeight: 0.4,
          impactWeight: 0.6,
          keywordsPositive: isBullish
            ? ['earnings beat', 'record profit', ...assetKeywords, ...themeKeywords]
            : ['recovery', 'bounce', 'support', ...assetKeywords],
          keywordsNegative: isBullish
            ? ['crash', 'fraud', 'default']
            : ['crash', 'fraud', 'default', 'sell off', ...themeKeywords],
          categories: [SentimentCategory.NEWS, SentimentCategory.WHALE_ACTIVITY],
        },
        agentsUsed: healthyAgents,
      },
      {
        name: isBullish ? 'Trend Rider' : 'Contrarian Balanced',
        description: `Medium-risk strategy for ${assets.join(', ')} — ${isBullish ? 'ride the bullish momentum with balanced signals' : 'look for contrarian opportunities while managing downside'}.`,
        riskLevel: 'MEDIUM' as const,
        estimatedWinRate: '62%',
        rationale: `Balances the ${analysis.sentiment} signal with impact analysis. Good for ${horizon.toLowerCase().replace('_', ' ')} horizon at risk ${risk}/10. Key themes: ${analysis.keyThemes.join(', ')}.`,
        config: {
          ...DEFAULT_STRATEGY_CONFIG,
          sentimentThreshold: 0.25,
          impactThreshold: 55,
          confidenceThreshold: 0.5,
          sentimentWeight: 0.5,
          impactWeight: 0.5,
          keywordsPositive: ['bullish', 'breakout', 'strong buy', ...assetKeywords, ...themeKeywords],
          keywordsNegative: ['bearish', 'downgrade', 'sell', 'warning'],
          categories: [SentimentCategory.SOCIAL_BUZZ, SentimentCategory.NEWS, SentimentCategory.WHALE_ACTIVITY],
        },
        agentsUsed: healthyAgents,
      },
      {
        name: isBullish ? 'Momentum Maximizer' : 'Aggressive Reversal Hunter',
        description: `High-frequency strategy — ${isBullish ? 'maximize gains on strong bullish sentiment' : 'bet on mean-reversion after bearish extremes'}.`,
        riskLevel: 'HIGH' as const,
        estimatedWinRate: '55%',
        rationale: `Leverages ${analysis.sentiment} sentiment with low thresholds for maximum signal capture. Analysis risk: ${analysis.riskLevel}. Themes: ${analysis.keyThemes.join(', ')}.`,
        config: {
          ...DEFAULT_STRATEGY_CONFIG,
          sentimentThreshold: 0.15,
          impactThreshold: 35,
          confidenceThreshold: 0.35,
          sentimentWeight: 0.7,
          impactWeight: 0.3,
          keywordsPositive: isBullish
            ? ['moon', 'pump', 'surge', 'rocket', 'buy', ...assetKeywords, ...themeKeywords]
            : ['bottom', 'oversold', 'reversal', 'bounce', ...assetKeywords, ...themeKeywords],
          keywordsNegative: ['dump', 'crash', 'panic', 'sell'],
          categories: [SentimentCategory.SOCIAL_BUZZ, SentimentCategory.NEWS, SentimentCategory.RUMOR, SentimentCategory.WHALE_ACTIVITY],
        },
        agentsUsed: healthyAgents,
      },
    ];
  }

  async generate(userId: string, assets: string[]): Promise<GeneratedStrategy[]> {
    // 1. Get investor profile
    const profile = await this.profileService.findByUser(userId);
    const risk = profile?.riskTolerance ?? 5;
    const horizon = profile?.horizon ?? 'MEDIUM_TERM';
    const capital = profile?.capitalAmount ?? 100_000;

    // 2. Gather recent sentiment stats from DB
    const recentPosts = await this.prisma.post.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        asset: { symbol: { in: assets.map(a => a.toUpperCase()) } },
      },
      include: { sentiment: true, asset: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Summarize sentiment
    const sentimentSummary = this.summarizeSentiment(recentPosts);

    // 3. Get available agents
    const agentStatus = await this.orchestrator.getAgentStatus();
    const healthyAgents = agentStatus.filter(a => a.healthy).map(a => a.name);

    // 4. Generate with LLM or fall back to rule-based
    if (this.openai) {
      return this.generateWithLLM(risk, horizon, capital, assets, sentimentSummary, healthyAgents);
    }
    return this.generateRuleBased(risk, horizon, capital, assets, healthyAgents);
  }

  private summarizeSentiment(posts: any[]): string {
    if (posts.length === 0) return 'No recent sentiment data available.';

    const byAsset: Record<string, { bullish: number; bearish: number; neutral: number }> = {};
    for (const p of posts) {
      const sym = p.asset?.symbol ?? 'UNKNOWN';
      if (!byAsset[sym]) byAsset[sym] = { bullish: 0, bearish: 0, neutral: 0 };
      const score = p.sentiment?.sentimentScore ?? 0;
      if (score > 0.1) byAsset[sym].bullish++;
      else if (score < -0.1) byAsset[sym].bearish++;
      else byAsset[sym].neutral++;
    }

    return Object.entries(byAsset)
      .map(([sym, s]) => `${sym}: ${s.bullish} bullish, ${s.bearish} bearish, ${s.neutral} neutral`)
      .join('; ');
  }

  private async generateWithLLM(
    risk: number,
    horizon: string,
    capital: number,
    assets: string[],
    sentimentSummary: string,
    healthyAgents: string[],
  ): Promise<GeneratedStrategy[]> {
    const prompt = `You are an Indian stock market strategy advisor. Generate 3 investment strategies.

User Profile:
- Risk tolerance: ${risk}/10
- Investment horizon: ${horizon}
- Capital: ₹${capital.toLocaleString('en-IN')}
- Selected assets: ${assets.join(', ')}

Available AI Agents: ${healthyAgents.join(', ')}
Recent sentiment (last 7 days): ${sentimentSummary}

Generate 3 strategies (Conservative, Balanced, Aggressive) as JSON array:
[{
  "name": "Strategy Name",
  "description": "1-2 sentence description",
  "riskLevel": "LOW|MEDIUM|HIGH",
  "estimatedWinRate": "65%",
  "rationale": "Why this strategy fits the user",
  "config": {
    "sentimentThreshold": 0.1-0.5,
    "impactThreshold": 30-80,
    "confidenceThreshold": 0.3-0.8,
    "sentimentWeight": 0.3-0.7,
    "impactWeight": 0.3-0.7,
    "keywordsPositive": ["keyword1"],
    "keywordsNegative": ["keyword1"],
    "categories": ["SOCIAL_BUZZ","NEWS","RUMOR","WHALE_ACTIVITY"]
  }
}]

Rules:
- sentimentWeight + impactWeight should sum to 1.0
- Conservative: high thresholds, NEWS+WHALE only, low risk  
- Balanced: moderate thresholds, all categories
- Aggressive: low thresholds, heavy sentiment weight, high frequency
- Tailor keywords to ${assets.join(',')} (Indian market context)

Return ONLY the JSON array, no markdown.`;

    try {
      const completion = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a financial strategy advisor. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 1200,
      });

      const raw = completion.choices[0]?.message?.content ?? '[]';
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array in response');

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((s: any) => ({
        name: s.name ?? 'Unnamed Strategy',
        description: s.description ?? '',
        riskLevel: s.riskLevel ?? 'MEDIUM',
        estimatedWinRate: s.estimatedWinRate ?? '50%',
        rationale: s.rationale ?? '',
        agentsUsed: healthyAgents,
        config: {
          ...DEFAULT_STRATEGY_CONFIG,
          ...s.config,
          categories: (s.config?.categories ?? ['SOCIAL_BUZZ', 'NEWS']).map(
            (c: string) => c as SentimentCategory,
          ),
        },
      }));
    } catch (err) {
      this.logger.error(`❌ LLM strategy generation failed: ${(err as Error).message}`);
      return this.generateRuleBased(risk, horizon, capital, assets, healthyAgents);
    }
  }

  /** Rule-based fallback when OpenAI is not configured */
  private generateRuleBased(
    risk: number,
    horizon: string,
    capital: number,
    assets: string[],
    healthyAgents: string[],
  ): GeneratedStrategy[] {
    const isShort = horizon === 'SHORT_TERM';
    const assetKeywords = assets.map(a => a.toLowerCase());

    return [
      {
        name: 'Conservative Guardian',
        description: `Low-risk strategy for ₹${capital.toLocaleString('en-IN')} — only acts on high-confidence news from verified sources.`,
        riskLevel: 'LOW' as const,
        estimatedWinRate: '72%',
        rationale: `Focuses on verified news with strict thresholds. Best for risk tolerance ${risk}/10.`,
        config: {
          ...DEFAULT_STRATEGY_CONFIG,
          sentimentThreshold: 0.4,
          impactThreshold: 75,
          confidenceThreshold: 0.7,
          sentimentWeight: 0.4,
          impactWeight: 0.6,
          keywordsPositive: ['earnings beat', 'record profit', ...assetKeywords.map(k => `${k} rally`)],
          keywordsNegative: ['crash', 'fraud', 'default'],
          categories: [SentimentCategory.NEWS, SentimentCategory.WHALE_ACTIVITY],
        },
        agentsUsed: healthyAgents,
      },
      {
        name: 'Balanced Opportunist',
        description: `Medium-risk strategy balancing sentiment signals with impact analysis for ${assets.join(', ')}.`,
        riskLevel: 'MEDIUM' as const,
        estimatedWinRate: '62%',
        rationale: `Equal weight on sentiment and impact. Good for ${isShort ? 'short' : 'medium'}-term ${horizon.toLowerCase().replace('_', ' ')}.`,
        config: {
          ...DEFAULT_STRATEGY_CONFIG,
          sentimentThreshold: 0.25,
          impactThreshold: 55,
          confidenceThreshold: 0.5,
          sentimentWeight: 0.5,
          impactWeight: 0.5,
          keywordsPositive: ['bullish', 'breakout', 'strong buy', ...assetKeywords],
          keywordsNegative: ['bearish', 'downgrade', 'sell', 'warning'],
          categories: [SentimentCategory.SOCIAL_BUZZ, SentimentCategory.NEWS, SentimentCategory.WHALE_ACTIVITY],
        },
        agentsUsed: healthyAgents,
      },
      {
        name: 'Aggressive Momentum',
        description: `High-frequency, sentiment-heavy strategy for maximum short-term gains on ${assets.join(', ')}.`,
        riskLevel: 'HIGH' as const,
        estimatedWinRate: '55%',
        rationale: `Captures fast-moving sentiment shifts. Higher frequency, higher risk. Use with risk tolerance >= 7/10.`,
        config: {
          ...DEFAULT_STRATEGY_CONFIG,
          sentimentThreshold: 0.15,
          impactThreshold: 35,
          confidenceThreshold: 0.35,
          sentimentWeight: 0.7,
          impactWeight: 0.3,
          keywordsPositive: ['moon', 'pump', 'surge', 'rocket', 'buy', ...assetKeywords],
          keywordsNegative: ['dump', 'crash', 'panic', 'sell'],
          categories: [SentimentCategory.SOCIAL_BUZZ, SentimentCategory.NEWS, SentimentCategory.RUMOR, SentimentCategory.WHALE_ACTIVITY],
        },
        agentsUsed: healthyAgents,
      },
    ];
  }
}
