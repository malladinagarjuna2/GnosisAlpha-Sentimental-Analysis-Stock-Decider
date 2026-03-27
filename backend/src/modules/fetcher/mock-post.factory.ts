// src/modules/fetcher/mock-post.factory.ts
// Pure function — no DI, no side effects. Generates mock social posts per asset.
// Replace the return value with real API responses in future phases.

export interface MockRawPost {
  externalId: string;
  source: 'TWITTER';
  assetSymbol: string;
  content: string;
  author: string;
  authorFollowers: number;
  retweetCount: number;
  likeCount: number;
  postedAt: Date;
}

const MOCK_ASSETS = ['BTC', 'ETH', 'TSLA', 'AAPL', 'SOL'] as const;

const TEMPLATES: Record<string, string[]> = {
  BTC: [
    'Bitcoin is looking bullish today! Breaking resistance at $70k 🚀',
    'BTC whales just moved 10,000 coins off exchanges. Something big is coming.',
    'Bitcoin dominance rising to 55%. Altcoins struggling.',
    'I just bought more BTC. This dip is a gift. #Bitcoin',
    'Bearish divergence on Bitcoin 4H chart. Be careful.',
    'On-chain data shows massive accumulation of $BTC by institutions.',
  ],
  ETH: [
    'Ethereum gas fees dropping significantly. DeFi activity picking up.',
    'ETH staking rewards just hit 5.2% APY. Validators rejoicing.',
    'Ethereum TVL back above $50B. Bulls are back.',
    'ETH/BTC ratio declining. Bitcoin likely to outperform short term.',
    'Massive ETH unlocks happening next week. Watch out for selling pressure.',
  ],
  TSLA: [
    'Tesla stock is going bullish after strong earnings report. $TSLA',
    'TSLA just broke out of a 3-month consolidation. Target: $300.',
    'Tesla deliveries miss expectations. Stock down pre-market. $TSLA',
    'Tesla Model Y is now the best-selling car globally. Incredible.',
    'Tesla partnership with major battery supplier rumored. $TSLA eyes $350.',
  ],
  AAPL: [
    'Apple Vision Pro demand exceeding supply. $AAPL looking strong.',
    'AAPL about to report earnings. Analysts expect record iPhone sales.',
    'Apple losing market share in China to Huawei. $AAPL headwinds ahead.',
    'Warren Buffett trimming AAPL position. Berkshire reduces stake by 10%.',
  ],
  SOL: [
    'Solana network uptime at 100% for 6 months straight! SOL 🚀',
    'SOL just surpassed ETH in daily DEX volume. Massive.',
    'Solana ecosystem TVL crosses $8B. $SOL moon incoming?',
    'Jupiter aggregator processing $2B daily volume on Solana. Bullish.',
    'SOL whale just loaded up. 500k SOL purchased on-chain.',
  ],
};

const AUTHORS = [
  { handle: 'cryptowhale_99',  followers: 250_000 },
  { handle: 'marketwatcher',   followers: 45_000  },
  { handle: 'tradingpro_x',    followers: 120_000 },
  { handle: 'defi_sage',       followers: 18_000  },
  { handle: 'bearish_billy',   followers: 32_000  },
  { handle: 'crypto_analyst',  followers: 320_000 },
];

const pick = <T>(arr: readonly T[] | T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Generates one mock post per asset (5 total) */
export function generateMockPosts(count = 5): MockRawPost[] {
  return [...MOCK_ASSETS]
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map((symbol) => {
      const author = pick(AUTHORS);
      return {
        externalId: `mock-${symbol}-${Date.now()}-${randInt(1000, 9999)}`,
        source: 'TWITTER' as const,
        assetSymbol: symbol,
        content: pick(TEMPLATES[symbol]),
        author: author.handle,
        authorFollowers: author.followers,
        retweetCount: randInt(0, 2000),
        likeCount: randInt(0, 10_000),
        postedAt: new Date(),
      };
    });
}
