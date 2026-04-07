// src/modules/fetcher/mock-post.factory.ts
// Pure function — no DI, no side effects. Generates mock social posts for NSE/BSE stocks.
// Used as fallback when Twitter API is unavailable.

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

const MOCK_ASSETS = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'TATAMOTORS'] as const;

const TEMPLATES: Record<string, string[]> = {
  RELIANCE: [
    'Reliance Industries Q4 results beat street estimates. Revenue up 12% YoY. #RELIANCE',
    'Jio adds 15 million subscribers this quarter. Reliance telecom arm growing fast. $RELIANCE',
    'Reliance Retail expansion slowing — competition from Tata, DMart heating up.',
    'Mukesh Ambani announces ₹75,000 crore investment in green energy. Bullish for RELIANCE long term.',
    'RELIANCE stock breaks key resistance at ₹2900. Next target ₹3100.',
    'Analysts downgrade Reliance — refining margins under pressure. Cautious outlook.',
  ],
  TCS: [
    'TCS wins $2 billion deal with a European bank. Largest deal this year! #TCS',
    'TCS attrition rate drops to 12.5%. Talent retention improving significantly.',
    'IT sector facing headwinds — TCS cuts guidance for FY27. Stock under pressure.',
    'TCS Q4 profit up 8%. Consistent performer in the IT space. $TCS',
    'TCS announces 1:1 bonus share. Rewarding long-term shareholders.',
  ],
  INFY: [
    'Infosys raises revenue guidance. AI services driving new deal wins. #INFY bullish!',
    'Infosys CEO says macro uncertainty could impact deal closures in H2.',
    'INFY partners with NVIDIA for enterprise AI solutions. Stock rallies 3%.',
    'Infosys buyback of ₹9,300 crore announced. Shareholder-friendly move.',
    'Infosys campus hiring down 40%. IT sector jobs slowdown continues.',
  ],
  HDFCBANK: [
    'HDFC Bank merger integration complete. NIMs improving steadily. #HDFCBANK',
    'HDFC Bank reports record net profit of ₹16,500 crore. Beating all estimates.',
    'RBI flags concerns over HDFC Bank deposit growth. Stock dips 2%.',
    'HDFC Bank crosses ₹15 lakh crore market cap. India\'s most valuable bank.',
    'Credit growth in HDFC Bank slowing — housing loan book under review.',
  ],
  ICICIBANK: [
    'ICICI Bank asset quality at 10-year best. NPA ratio at historic low. #ICICIBANK',
    'ICICI Bank digital transactions up 45% YoY. Leading fintech innovation.',
    'ICICI Bank raises fixed deposit rates. Competing aggressively for deposits.',
    'Analysts rate ICICI Bank as top pick in banking sector for FY27.',
  ],
  SBIN: [
    'SBI reports ₹18,000 crore quarterly profit. PSU bank leader. #SBIN',
    'SBI YONO app crosses 7 crore users. Digital banking revolution in India.',
    'Government plans to sell 5% stake in SBI via OFS. Stock under pressure.',
    'SBI home loan rates cut to 8.25%. Most competitive in the market.',
  ],
  TATAMOTORS: [
    'Tata Motors EV sales up 60% this quarter. Nexon EV dominates market. #TATAMOTORS',
    'JLR order book at record high. Tata Motors international biz recovering.',
    'Tata Motors stock surges 5% on strong commercial vehicle numbers.',
    'Tata Motors faces margin pressure from rising raw material costs.',
  ],
};

const AUTHORS = [
  { handle: 'CNBCTV18Live',     followers: 5_200_000 },
  { handle: 'livemint',         followers: 3_800_000 },
  { handle: 'EconomicTimes',    followers: 8_500_000 },
  { handle: 'NDTVProfit',       followers: 2_100_000 },
  { handle: 'market_analyst_x', followers: 45_000 },
  { handle: 'nse_trader_pro',   followers: 120_000 },
  { handle: 'zerodha_insights', followers: 320_000 },
];

const pick = <T>(arr: readonly T[] | T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Generates mock NSE/BSE posts */
export function generateMockPosts(count = 5): MockRawPost[] {
  return [...MOCK_ASSETS]
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map((symbol) => {
      const author = pick(AUTHORS);
      const templates = TEMPLATES[symbol] ?? [`${symbol} showing interesting price action today.`];
      return {
        externalId: `mock-${symbol}-${Date.now()}-${randInt(1000, 9999)}`,
        source: 'TWITTER' as const,
        assetSymbol: symbol,
        content: pick(templates),
        author: author.handle,
        authorFollowers: author.followers,
        retweetCount: randInt(0, 2000),
        likeCount: randInt(0, 10_000),
        postedAt: new Date(),
      };
    });
}
