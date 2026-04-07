# Project Context — NSE/BSE Market Sentiment Intelligence Platform

> **Last Updated:** 2026-04-04  
> **Hackathon:** HackByte  
> **Repo:** `ROKUMATE/Sentimental-Analysis-Stock-Pjt`

---

## 1. What This Project Is

An AI-powered NSE/BSE stock market intelligence platform that:
1. Scrapes tweets from **trusted Indian financial news channels** (CNBC-TV18, Mint, ET, BSE, NSE, etc.)
2. Runs **NLP sentiment analysis** on scraped tweets
3. Matches tweets to **NSE stock symbols** (RELIANCE, TCS, INFY, etc.)
4. Fetches **real historical prices** from Yahoo Finance
5. Simulates trades based on sentiment signals
6. Shows the user: **"If you had used our AI agent 1 week ago, you'd have gained ₹X today"**
7. Generates **AI-powered personalized strategies** (Conservative/Balanced/Aggressive) using GPT-4o-mini

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  Next.js 16 + Tailwind 4 + shadcn/ui + Recharts + Zustand     │
│  Port: 3000                                                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (Axios)
┌──────────────────────────▼──────────────────────────────────────┐
│                     BACKEND (NestJS)                             │
│  Port: 3001   Prefix: /api                                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              AGENT ORCHESTRATOR                           │   │
│  │  Registers all agents, runs them, aggregates signals      │   │
│  │                                                           │   │
│  │  ┌─────────────────┐  ┌──────────────┐  ┌────────────┐  │   │
│  │  │ NLP Sentiment   │  │ Deep Analysis│  │ Trading    │  │   │
│  │  │ Agent (ACTIVE)  │  │ (future)     │  │ Algo       │  │   │
│  │  │ wraps           │  │ wraps        │  │ (future)   │  │   │
│  │  │ SentimentService│  │ AnalysisServ │  │ RSI/MACD   │  │   │
│  │  └─────────────────┘  └──────────────┘  └────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │ PriceDataPort  │  │ TradeExecutor  │  │ BrokerPort       │  │
│  │ Yahoo Finance  │  │ MockTradeExec  │  │ (unified future) │  │
│  │ Adapter (.NS)  │  │ Paper Trading  │  │ Kite/Alpaca      │  │
│  └────────────────┘  └────────────────┘  └──────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     WORKER (BullMQ)                              │
│  Port: N/A  (background process)                                │
│  - Fetches tweets every 30s                                     │
│  - Runs NLP sentiment on new tweets                             │
│  - Triggers alerts                                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│              INFRASTRUCTURE                                      │
│  PostgreSQL (Prisma ORM) + Redis (BullMQ queues)                │
│  docker-compose.yml for local dev                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Framework | NestJS (TypeScript) |
| Database | PostgreSQL via Prisma ORM |
| Queue | BullMQ + Redis |
| Twitter | Nitter scraping via `TwitterFetcherAdapter` |
| Prices | `yahoo-finance2` v3 |
| LLM | OpenAI GPT-4o-mini |
| Auth | JWT (passport-jwt) |
| Validation | class-validator + class-transformer |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 + tw-animate-css |
| Components | shadcn/ui (Radix primitives) |
| Charts | Recharts |
| State | Zustand |
| HTTP | Axios |
| Fonts | Inter (body) + Fira Code (monospace/code) |
| Websocket | socket.io-client |

---

## 4. Backend Module Map

```
backend/src/modules/
├── agents/                    ← NEW: Multi-agent architecture
│   ├── ports/
│   │   ├── agent.port.ts      ← AgentPort interface (universal)
│   │   └── broker.port.ts     ← BrokerPort interface (trade + price)
│   ├── adapters/
│   │   └── nlp-sentiment.agent.ts  ← Wraps SentimentService
│   ├── agent-orchestrator.service.ts  ← Registers + runs agents
│   ├── agents.controller.ts   ← GET /api/agents
│   └── agents.module.ts
├── analysis/                  ← Deep LLM analysis (GPT-4o-mini)
├── alerts/                    ← In-app + email alerts
├── assets/                    ← Stock/crypto asset CRUD
├── auth/                      ← JWT signup/login
├── backtest/                  ← NEW: 7-day backtest engine
│   ├── ports/
│   │   ├── price-data.port.ts ← PriceDataPort interface
│   │   └── trade-executor.port.ts ← TradeExecutorPort interface
│   ├── adapters/
│   │   ├── yahoo-finance.adapter.ts ← Yahoo Finance v3 (.NS suffix)
│   │   └── mock-trade-executor.adapter.ts ← Paper trading
│   ├── trade-simulator.ts     ← P&L calculation logic
│   ├── backtest.service.ts    ← Core orchestrator (uses AgentOrchestrator)
│   ├── backtest.controller.ts ← POST /api/backtest
│   └── dto/
│       ├── backtest-request.dto.ts
│       └── backtest-result.dto.ts
├── channels/                  ← Social channel management
├── events/                    ← WebSocket gateway (Socket.IO)
├── fetcher/                   ← Twitter scraping + mock posts
│   ├── twitter-fetcher.adapter.ts ← Nitter scraping
│   ├── mock-post.factory.ts   ← NSE stock mock tweets
│   ├── seeder.service.ts      ← Seeds 10 NSE stocks + 15 trusted channels
│   └── fetcher.service.ts     ← ASSET_KEYWORDS for NSE mapping
├── posts/                     ← Post CRUD
├── preferences/               ← User asset preferences
├── profile/                   ← NEW: Investor onboarding
│   ├── profile.service.ts     ← Upsert + findByUser
│   ├── profile.controller.ts  ← POST + GET /api/profile
│   └── dto/upsert-profile.dto.ts ← Validated DTO
├── sentiment/                 ← NLP keyword-based sentiment
├── strategies/                ← Strategy CRUD + AI generator
│   ├── strategies.service.ts  ← CRUD + evaluate()
│   ├── strategy-generator.service.ts ← NEW: GPT-4o-mini + rule-based fallback
│   └── strategies.controller.ts ← Includes POST /api/strategies/generate
├── users/                     ← User management
├── whale/                     ← Whale detection
└── workers/                   ← BullMQ worker processors
```

---

## 5. Database Schema (Prisma)

### Key Models
- **User** — email, password, JWT auth
- **Asset** — name, symbol, type (STOCK/CRYPTO)
- **Post** — scraped tweet content, author, postedAt
- **SentimentResult** — score (-1 to 1), impact (0-100), confidence, category
- **Strategy** — user-defined scoring config (JSON)
- **Alert** — triggered when sentiment exceeds threshold
- **SocialChannel** — platform, handle, isDefault, **trustScore** (0-1)
- **UserPreference** — links User ↔ Asset (watchlist)
- **InvestorProfile** — **riskTolerance** (1-10), **horizon** (enum), **capitalAmount**

### Enums
- `AssetType`: STOCK, CRYPTO
- `PostSource`: TWITTER, REDDIT
- `SentimentCategory`: SOCIAL_BUZZ, NEWS, RUMOR, WHALE_ACTIVITY
- `AnalysisMethod`: NLP, LLM
- `AlertType`: IN_APP, EMAIL
- `SocialPlatform`: TWITTER, REDDIT
- `InvestHorizon`: SHORT_TERM, MEDIUM_TERM, LONG_TERM

---

## 6. API Endpoints (35 total)

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Get JWT token |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/me` | Current user profile |

### Assets
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/assets` | List all (public) |
| POST | `/api/assets` | Create asset |
| GET | `/api/assets/:id` | Get one |
| GET | `/api/assets/tracked/me` | User's watchlist |
| POST | `/api/assets/add` | Track asset |
| DELETE | `/api/assets/remove` | Untrack asset |

### Posts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/posts` | List with filters |
| GET | `/api/posts/asset/:id` | By asset |
| GET | `/api/posts/:id` | Single post |
| POST | `/api/posts` | Create post |

### Sentiment & Analysis
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sentiment/analyze-llm/:id` | LLM analysis |
| POST | `/api/analysis/deep` | Deep GPT-4o-mini analysis |

### Strategies
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/strategies/strategy` | Get active |
| POST | `/api/strategies/strategy/update` | Update active |
| POST | `/api/strategies/generate` | **AI Generate 3 strategies** |

### Alerts, Preferences, Channels, Whale, Fetcher
See `api_context/API-Reference.md` for full details.

### NEW Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/profile` | Create/update investor profile |
| GET | `/api/profile` | Get investor profile |
| POST | `/api/backtest` | **Run 7-day backtest** |
| POST | `/api/strategies/generate` | **AI strategy generation** |
| GET | `/api/channels/recommended` | Asset-based channel recommendations |
| GET | `/api/agents` | **Agent registry + health status** |

---

## 7. Multi-Agent Architecture

### How It Works

```
AgentPort interface (agent.port.ts)
  ├── name, type, version
  ├── analyze(context) → AgentSignal[]
  └── isHealthy() → boolean

Every analysis engine implements AgentPort:
  ✅ NlpSentimentAgent (active — wraps SentimentService)
  ⬜ DeepAnalysisAgent (future — wraps AnalysisService/LLM)
  ⬜ ExternalMultiAgent (future — HTTP to external system)
  ⬜ TradingAlgoAgent (future — RSI/MACD/momentum)
```

### Adding a New Agent (4 steps)
1. Create `adapters/my-agent.ts` implementing `AgentPort`
2. Add to `agents.module.ts` providers
3. Inject into `AgentOrchestratorService` constructor
4. Call `this.register()` in `onModuleInit`

**That's it.** Backtest, strategy generator, `/api/agents` all pick it up automatically.

### BrokerPort (trade execution)
```
BrokerPort interface (broker.port.ts)
  ├── execute(order) → TradeResult
  ├── getHistoricalPrices?() ← optional
  ├── getLatestPrice?() ← optional
  └── getPortfolio?() ← optional

Adapters:
  ✅ MockBroker (paper trading — active)
  ⬜ KiteBroker (Zerodha — future)
  ⬜ AlpacaBroker (US stocks — future)
```

---

## 8. Backtest Pipeline (the killer feature)

```
User sends: POST /api/backtest { assets: ["RELIANCE","TCS"], lookbackDays: 7, capitalAmount: 100000 }

Step 1: Fetch InvestorProfile (risk, horizon, capital)
Step 2: Query trusted channels (trustScore >= 0.7) from DB
Step 3: Scrape tweets from each channel via TwitterFetcherAdapter
Step 4: Fetch 7-day OHLCV from Yahoo Finance (RELIANCE.NS, TCS.NS)
Step 5: Run AgentOrchestrator.runAll() → all agents produce signals
Step 6: Convert AgentSignals → BacktestSignals with real prices
Step 7: simulateTrades() → pairs BUY/SELL, calculates P&L
Step 8: Generate recommendation string

Response includes:
  - projectedGainINR: ₹24,650
  - projectedGainPct: 24.65%
  - winRate: "67%"
  - totalTrades: 12
  - signals: [{date, asset, action, price, score, source}]
  - recommendation: "Based on risk 7/10 and ₹1L capital..."
  - priceDataProvider: "Yahoo Finance"
  - tradeExecutor: "Mock (Paper Trading)"
```

---

## 9. Frontend Pages

```
frontend/app/
├── page.tsx                           ← Landing page
├── layout.tsx                         ← Root layout (dark mode, Inter + Fira Code)
├── globals.css                        ← Design tokens, animations, glassmorphism
├── auth/
│   ├── login/page.tsx                 ← Login form
│   └── signup/page.tsx                ← Signup form
└── dashboard/
    ├── layout.tsx                     ← Protected route + Navbar + Sidebar
    ├── page.tsx                       ← Dashboard overview (stats, posts, alerts)
    ├── assets/page.tsx                ← Asset management
    ├── posts/page.tsx                 ← Posts feed
    ├── posts/[id]/page.tsx            ← Single post detail
    ├── alerts/page.tsx                ← Alerts list
    ├── profile/page.tsx               ← NEW: Investor onboarding
    ├── backtest/page.tsx              ← NEW: Backtest engine UI
    ├── strategies/page.tsx            ← NEW: AI strategy generator
    ├── agents/page.tsx                ← NEW: Agent registry
    └── settings/
        ├── page.tsx                   ← Settings overview
        ├── strategy/page.tsx          ← Manual strategy config
        └── channels/page.tsx          ← Channel management
```

### Sidebar Navigation
```
MAIN
  Dashboard     → /dashboard
  Assets        → /dashboard/assets
  Posts         → /dashboard/posts
  Alerts        → /dashboard/alerts

INTELLIGENCE
  Backtest      → /dashboard/backtest       [NEW badge]
  AI Strategies → /dashboard/strategies     [AI badge]
  Agents        → /dashboard/agents

SETTINGS
  Profile       → /dashboard/profile
  Strategy      → /dashboard/settings/strategy
  Channels      → /dashboard/settings/channels
```

---

## 10. Seeded Data

### NSE Stocks (10)
RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, SBIN, WIPRO, TATAMOTORS, BAJFINANCE, LT

### Trusted Channels (15, trustScore 0.75–0.95)
CNBCTV18News, livaborselive, EconomicTimes, BSEIndia, NSEIndia,
monaborsecontrol, NDTVProfit, aborseFinancialExpress, ZeeBusiness,
BloombergQuint, MotilalOswal, ICICIDirect, HDFCSec, ZerodhaVarsity,
MarketSmithIndia

### ASSET_KEYWORDS Map
```typescript
RELIANCE → ['reliance', 'ril', '$reliance', 'jio', 'mukesh ambani']
TCS      → ['tcs', 'tata consultancy', '$tcs']
INFY     → ['infosys', 'infy', '$infy', 'narayana murthy']
// ... etc
```

---

## 11. Environment Variables

```env
# Backend (.env)
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
JWT_SECRET=...
OPENAI_API_KEY=...           # For GPT-4o-mini strategy generation
TWITTER_BEARER_TOKEN=...     # For Twitter API (optional, has Nitter fallback)

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## 12. Running Locally

```bash
# 1. Start infra
docker compose up -d   # PostgreSQL + Redis

# 2. Backend
cd backend
cp .env.example .env   # fill in values
npx prisma migrate dev
npx prisma generate
npm run start:dev      # port 3001
npm run start:worker   # background tweet scraping

# 3. Frontend
cd frontend
cp .env.local.example .env.local
npm run dev            # port 3000
```

---

## 13. Known Issues / Notes

1. **IDE lint errors** for `trustScore` and `InvestHorizon` — these are **stale Prisma client cache**. After `npx prisma generate` + server restart, they resolve. `npx tsc --noEmit` passes with 0 errors.

2. **Twitter scraping** depends on Nitter instances being available. Falls back to mock posts if scraping fails.

3. **GPT-4o-mini** for strategy generation requires `OPENAI_API_KEY`. Falls back to rule-based strategies if not configured.

4. **Yahoo Finance** auto-appends `.NS` suffix for NSE stocks. Works for all major NSE symbols.

---

## 14. What's Done vs What's Next

### ✅ Done
- Full backend with 35 endpoints
- Multi-agent architecture (AgentPort + Orchestrator)
- NLP Sentiment Agent (active)
- 7-day backtesting with real prices
- AI strategy generator (GPT-4o-mini + fallback)
- Investor profile onboarding
- Trusted channel ecosystem (15 channels seeded)
- Channel recommender
- Frontend: 4 new pages (Profile, Backtest, Strategies, Agents)
- Fira Code + Inter fonts + animations
- API docs (API-Reference.md + openapi.json + openapi.yml)

### ⬜ Next Steps
1. **Multi-agent integration** — connect the model from the other laptop via HTTP to `ExternalMultiAgent`
2. **Kite/Zerodha** — implement `KiteBroker` for live NSE/BSE trading
3. **Trading Algo Agent** — RSI, MACD, Bollinger Bands analysis on price data
4. **Deep Analysis Agent** — wrap `AnalysisService` as `AgentPort`
5. **Frontend polish** — strategy apply flow, backtest charts (Recharts), real-time WebSocket updates
6. **Deploy** — Docker containerization for Render/Railway/Vercel
