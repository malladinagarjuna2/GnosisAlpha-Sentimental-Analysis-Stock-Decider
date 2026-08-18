# 📊 Market Sentiment Intelligence

**Turn what India's financial Twitter is saying into backtested, rupee-denominated trading signals.**

An AI-powered NSE/BSE market intelligence platform that scrapes trusted Indian financial news channels, runs sentiment analysis, matches it to real stock symbols, and answers one killer question:

> _"If you had followed our AI agent one week ago, you'd have gained **₹24,650 (+24.65%)** today."_

Built for **HackByte**. Repo: `ROKUMATE/Sentimental-Analysis-Stock-Pjt`

---

## 🎯 What It Does

1. **Scrapes tweets** from trusted Indian financial channels — CNBC-TV18, Mint, ET, BSE, NSE, NDTV Profit, and 15+ others (each with a `trustScore` from 0.75–0.95).
2. **Runs NLP sentiment analysis** — producing a sentiment score, impact score, confidence, category, and reason for every post.
3. **Matches posts to NSE symbols** — RELIANCE, TCS, INFY, HDFCBANK, and more, via a keyword map.
4. **Fetches real historical prices** from Yahoo Finance (`.NS` suffix for NSE listings).
5. **Simulates trades** off sentiment signals and computes real profit & loss.
6. **Shows your hypothetical gain** — the "you'd have earned ₹X" backtest is the headline feature.
7. **Generates personalized AI strategies** — Conservative / Balanced / Aggressive, tuned to your risk profile, horizon, and capital, using GPT-4o-mini.

No streaming firehose. No noise. Polling every 30–60 seconds, trusted sources only, just signal.

---

## ✨ Features

- 🔐 **JWT authentication** — signup / login with bcrypt-hashed passwords
- 📈 **Asset tracking** — watchlist of NSE/BSE stocks, per-asset alert toggles
- 📰 **Trusted channel ecosystem** — 15 seeded, trust-scored financial sources + a channel recommender
- 🧠 **NLP sentiment engine** — keyword-based scoring with engagement weighting
- ⚙️ **Configurable strategies** — user-defined keywords, impact/confidence thresholds
- 🐋 **Whale detection** — threshold-based unusual-activity flags
- 📧 **Email alerts** — Nodemailer notifications when thresholds are crossed (optional)
- 🔬 **7-day backtesting** — the killer feature: real prices, simulated trades, real P&L
- 🤖 **AI strategy generator** — GPT-4o-mini with a rule-based fallback
- 🧑‍💼 **Investor onboarding** — risk score, investment horizon, capital
- 🧩 **Pluggable multi-agent architecture** — add a new AI agent in 4 steps
- 🔎 **On-demand deep analysis** — a 3-agent LLM pipeline (Gemini + GPT-4o-mini) that never runs automatically; only when you click a post
- 🛡️ **ArmorIQ trust layer** — per-agent intent tokens, policy gates, hallucination detection, and a cryptographic execution + reasoning audit on every deep analysis
- ⚡ **Real-time updates** — Socket.IO for live posts, sentiment, and alerts

---

## 🏗️ Architecture

The system is organized into **five layers**:

```
┌───────────────────────────────────────────────────────────────┐
│  1. FRONTEND  ·  Next.js 16 (App Router)                       │
│     Dashboard · Backtest · AI Strategies · Agents · Profile    │
│     REST (Axios)  +  WebSocket (Socket.IO)                     │
└───────────────────────────────┬───────────────────────────────┘
                                 │
┌───────────────────────────────┴───────────────────────────────┐
│  2. API  ·  NestJS  ·  ~35 REST endpoints                      │
│     Auth · Profiles · Assets · Strategies · Backtest · Agents  │
└───────────────────────────────┬───────────────────────────────┘
                                 │
┌───────────────────────────────┴───────────────────────────────┐
│  3. INTELLIGENCE  ·  Agent Orchestrator                        │
│     Pluggable agents (NLP now; LLM / algo / multi-agent next)  │
│     Strategy Generator (GPT-4o-mini)                           │
├───────────────────────────────────────────────────────────────┤
│  4. BACKTESTING ENGINE                                         │
│     scrape → run agents → real prices → simulate → P&L         │
│     Port/Adapter pattern (Yahoo→Kite, Mock→Live are swaps)     │
├───────────────────────────────────────────────────────────────┤
│  5. WORKERS  ·  BullMQ (run separately from the HTTP server)   │
│     Poll Twitter (30s) → NLP sentiment → threshold alerts      │
└───────────────────────────────┬───────────────────────────────┘
                                 │
        ┌────────────────────────┴────────────────────────┐
        │  PostgreSQL (Prisma ORM)      Redis (job queues) │
        └──────────────────────────────────────────────────┘
```

**Key design principles**

- API and workers run as **separate processes** so ingestion never blocks the HTTP server.
- Posts flow through a queue: _ingest → store → analyze → alert_.
- **Polling**, not streaming (30–60s cadence).
- The **Port/Adapter pattern** lets you swap providers (Yahoo Finance → Zerodha Kite for prices; Mock → live broker for trades) with **no business-logic changes**.

**External dependencies:** Twitter / Nitter (tweet scraping), Yahoo Finance (historical prices), OpenAI GPT-4o-mini (strategy generation + deep analysis).

---

## 🛠️ Tech Stack

| Layer        | Technology                                                        |
| ------------ | ----------------------------------------------------------------- |
| **Backend**  | NestJS · TypeScript · PostgreSQL · Prisma ORM                     |
| **Queue**    | Redis · BullMQ                                                     |
| **Frontend** | Next.js 16 (App Router) · shadcn/ui · Tailwind CSS                 |
| **State/API**| Zustand · Axios · Socket.IO client                                |
| **Forms**    | React Hook Form · Zod                                              |
| **Charts**   | Recharts                                                          |
| **AI gov.**  | ArmorIQ (`@armoriq/sdk`) — execution + reasoning verification     |
| **AI/LLM**   | OpenAI GPT-4o-mini · Google Gemini                                                 |
| **Data**     | Yahoo Finance (prices) · Twitter/Nitter (tweets)                  |

---

## 🧩 Multi-Agent Architecture

> This is the **backtest/signal** agent system (the `AgentPort` orchestrator). It's separate from the 3-agent **deep-analysis** pipeline described in the [ArmorIQ section](#️-deep-analysis--armoriq-trust-layer) below — that one runs per-post on demand and is wrapped by ArmorIQ verification.

Every analysis engine implements a single universal `AgentPort` interface:

```
AgentPort
  ├── name · type · version
  ├── analyze(context) → AgentSignal[]
  └── isHealthy() → boolean
```

| Agent                | Status | Purpose                                   |
| -------------------- | :----: | ----------------------------------------- |
| `NlpSentimentAgent`  |   ✅   | Keyword sentiment (wraps SentimentService)|
| `DeepAnalysisAgent`  |   ⬜   | LLM deep analysis (wraps AnalysisService) |
| `ExternalMultiAgent` |   ⬜   | HTTP bridge to an external agent system   |
| `TradingAlgoAgent`   |   ⬜   | RSI / MACD / Bollinger / momentum         |

**Adding a new agent takes 4 steps:**

1. Create `adapters/my-agent.ts` implementing `AgentPort`.
2. Add it to `agents.module.ts` providers.
3. Inject it into `AgentOrchestratorService`.
4. Call `this.register()` in `onModuleInit`.

That's it — the backtest engine, strategy generator, and `GET /api/agents` all pick it up automatically.

Trade execution follows the same pattern via `BrokerPort`: `MockBroker` (paper trading, active) today, with `KiteBroker` (Zerodha) and `AlpacaBroker` (US stocks) as drop-in future adapters.

---

## 🔬 The Backtest Pipeline (Killer Feature)

```
POST /api/backtest
{ "assets": ["RELIANCE", "TCS"], "lookbackDays": 7, "capitalAmount": 100000 }
```

1. Load the user's **investor profile** (risk, horizon, capital).
2. Query **trusted channels** (`trustScore >= 0.7`) from the DB.
3. **Scrape tweets** from each channel via the Twitter fetcher.
4. Fetch **7-day OHLCV** from Yahoo Finance (`RELIANCE.NS`, `TCS.NS`).
5. Run `AgentOrchestrator.runAll()` → every agent emits signals.
6. Convert agent signals → **backtest signals** stamped with real prices.
7. `simulateTrades()` pairs BUY/SELL orders and computes **P&L**.
8. Generate a plain-English **recommendation**.

**Response:**

```jsonc
{
  "projectedGainINR": 24650,
  "projectedGainPct": 24.65,
  "winRate": "67%",
  "totalTrades": 12,
  "signals": [ { "date": "...", "asset": "RELIANCE", "action": "BUY", "price": 2841.5, "score": 0.72, "source": "CNBCTV18News" } ],
  "recommendation": "Based on risk 7/10 and ₹1L capital...",
  "priceDataProvider": "Yahoo Finance",
  "tradeExecutor": "Mock (Paper Trading)"
}
```

---

## 🛡️ Deep Analysis + ArmorIQ Trust Layer

Clicking a post triggers `POST /api/analysis/deep` — an on-demand, multi-agent explanation pipeline that **never runs automatically** (this keeps LLM costs down). Three specialized agents run in sequence:

| Agent | Model | Produces |
| ----- | ----- | -------- |
| **1 · Sentiment**   | Gemini      | asset, relevance, tweet type, sentiment score, matched keywords, confidence |
| **2 · Risk**        | GPT-4o-mini | sarcasm, irony, pump-and-dump, emotional manipulation, risk flags, risk level |
| **3 · Explanation** | Gemini      | summary, reasoning, key signals, recommendation |

A final code-only step derives the sentiment label, confidence score, and `pipelineStatus` (`full` / `partial` / `mock`). If any agent fails, it falls back to a safe default instead of breaking the response.

**Wrapping all of this is ArmorIQ** (`@armoriq/sdk`) — a per-agent governance layer that makes each analysis _verifiable_, not just plausible. It attaches a `security` block to every response containing two independent proofs:

- **Execution proof** — each agent runs under its own signed **intent token** (scoped policy + TTL). Plans are captured, validated, and finalized against the ArmorIQ proxy, so the response can prove the pipeline ran _as authorized_.
- **Reasoning proof (`quickVerify`)** — a local consistency check producing a `reasoningScore` (0–1) that flags contradictions: bullish sentiment vs. HIGH risk, pump-and-dump alongside hype, sarcasm with a positive score, or **hallucination** (Agent 3 citing signals absent from the original post).

The headline flag combines both: `verified = executionVerified && reasoningScore ≥ 0.7 && !hallucination`.

**Policy gates** can hard-stop the pipeline — e.g. if Agent 2 flags `riskLevel = HIGH` **and** pump-and-dump, Agent 3's explanation is **blocked** and replaced with a "do not act on this signal" warning.

**Built to fail safe:**

- ArmorIQ is **optional** — with no `ARMORIQ_API_KEY`, the pipeline runs in **degraded mode** and the response says so honestly (`verified: false`, `degraded: true`) rather than pretending it was verified.
- Network calls **fail open** — ArmorIQ availability never blocks an agent from running.
- A **circuit breaker** trips after 3 consecutive failures and backs off for 60 seconds.

Every response carries a full **audit trail** — per-agent token IDs, policy decisions, and outcomes — ready to render on a security dashboard.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+ and **Redis** 6+ (Docker recommended)
- Optional: `OPENAI_API_KEY` (AI strategies + deep analysis), `TWITTER_BEARER_TOKEN` (real tweet fetching), SMTP creds (email alerts)

### 1. Start infrastructure

```bash
docker compose up -d          # PostgreSQL 16 (:5432) + Redis 7 (:6379)
```

### 2. Backend

```bash
cd backend
cp .env.example .env           # fill in values (see below)
npm install
npx prisma generate
npx prisma migrate dev         # runs migrations
npm run start:dev              # HTTP API server  → http://localhost:3001
npm run start:worker           # background worker (tweet scraping + sentiment)
```

> Run the API server and the worker in **two separate terminals** — they're independent processes.

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install                    # (pnpm install also works)
npm run dev                    # → http://localhost:3000
```

---

## 🔑 Environment Variables

**Backend — `backend/.env`**

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/market_sentiment?schema=public"
JWT_SECRET=any_random_strong_string
JWT_EXPIRES_IN=7d
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3001
FRONTEND_URL=http://localhost:3000

# Optional — email alerts
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-gmail-app-password

# Optional — real Twitter fetching (has a Nitter fallback)
TWITTER_BEARER_TOKEN=your_bearer_token

# Optional — LLMs for strategy generation + deep analysis (fallbacks apply if unset)
OPENAI_API_KEY=sk-your-openai-key          # GPT-4o-mini (strategies + Risk agent)
GEMINI_API_KEY=your-gemini-key             # Gemini (Sentiment + Explanation agents)

# Optional — ArmorIQ AI governance (execution + reasoning verification; degraded mode if unset)
ARMORIQ_API_KEY=ak_live_your_key           # must start with ak_live_
ARMORIQ_USER_ID=default-user
ARMORIQ_AGENT_ID=sentiment-agent-v1
ARMORIQ_PROXY_URL=https://customer-proxy.armoriq.ai

# Optional — Zerodha Kite (live NSE/BSE trading; future / paper trading works without it)
KITE_API_KEY=
KITE_API_SECRET=
KITE_ACCESS_TOKEN=
KITE_USER_ID=
```

**Frontend — `frontend/.env.local`**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

---

## 📡 API Reference

Base URL: `http://localhost:3001/api`
All routes except `POST /auth/signup`, `POST /auth/login`, and `GET /assets` require `Authorization: Bearer <accessToken>`.

**Auth & Users**

| Method | Path             | Description        |
| ------ | ---------------- | ------------------ |
| POST   | `/auth/signup`   | Create account     |
| POST   | `/auth/login`    | Sign in (returns JWT) |
| GET    | `/users/me`      | Current user       |

**Assets & Preferences**

| Method | Path                  | Description         |
| ------ | --------------------- | ------------------- |
| GET    | `/assets`             | List all assets     |
| GET    | `/assets/tracked/me`  | User's tracked assets |
| POST   | `/assets/add`         | Track an asset      |
| DELETE | `/assets/remove`      | Untrack an asset    |
| GET    | `/preferences`        | Get preferences     |
| PATCH  | `/preferences/:assetId/toggle-alert` | Toggle alert |

**Posts, Sentiment & Alerts**

| Method | Path              | Description             |
| ------ | ----------------- | ----------------------- |
| GET    | `/posts`          | Posts (filterable)      |
| GET    | `/posts/:id`      | Single post + sentiment |
| POST   | `/analysis/deep`  | 3-agent analysis + ArmorIQ `security` block |
| GET    | `/alerts`         | User's alerts           |

**Intelligence (the new stuff)**

| Method | Path                     | Description                     |
| ------ | ------------------------ | ------------------------------- |
| POST   | `/profile`               | Create/update investor profile  |
| GET    | `/profile`               | Get investor profile            |
| POST   | `/backtest`              | **Run a 7-day backtest**        |
| POST   | `/strategies/generate`   | **AI strategy generation**      |
| GET    | `/channels/recommended`  | Asset-based channel picks       |
| GET    | `/agents`                | **Agent registry + health**     |

Full spec lives in `API-Reference.md` / `openapi.yml`.

**WebSocket events:** `new-post`, `new-sentiment`, `new-alert`, `new-alert-broadcast`.

---

## 📁 Project Structure

```
.
├── backend/                       # NestJS API + workers
│   └── src/
│       ├── modules/
│       │   ├── agents/            # Multi-agent orchestrator (AgentPort)
│       │   ├── backtest/          # 7-day engine (ports + adapters + simulator)
│       │   ├── strategies/        # Strategy CRUD + GPT-4o-mini generator
│       │   ├── profile/           # Investor onboarding
│       │   ├── fetcher/           # Twitter scraping + seeder
│       │   ├── sentiment/         # NLP engine
│       │   ├── analysis/          # On-demand LLM deep analysis
│       │   ├── alerts/ channels/ assets/ posts/ auth/ users/
│       │   ├── whale/ preferences/ events/ zerodha/
│       │   └── workers/           # BullMQ processors
│       ├── app.module.ts          # HTTP server module
│       └── worker-app.module.ts   # worker-only module
├── frontend/                      # Next.js 16 app
│   ├── app/
│   │   ├── auth/ (login, signup)
│   │   └── dashboard/ (assets, posts, alerts, backtest,
│   │                   strategies, agents, profile, settings)
│   ├── components/ · hooks/ · lib/
│   └── README.md
├── docker-compose.yml             # PostgreSQL + Redis
└── README.md                      # you are here
```

---

## 🌱 Seeded Data

**NSE stocks (10):** RELIANCE · TCS · INFY · HDFCBANK · ICICIBANK · SBIN · WIPRO · TATAMOTORS · BAJFINANCE · LT

**Trusted channels (15, trustScore 0.75–0.95):** CNBC-TV18 · Mint · Economic Times · BSE India · NSE India · NDTV Profit · Financial Express · Zee Business · Bloomberg Quint · Moneycontrol · Motilal Oswal · ICICI Direct · HDFC Securities · Zerodha Varsity · MarketSmith India

**Symbol keyword mapping** (`ASSET_KEYWORDS`) — e.g. `RELIANCE → [reliance, ril, jio, mukesh ambani]`, `INFY → [infosys, infy, narayana murthy]`.

---

## 🗺️ Roadmap

**✅ Done**

- Full backend (~35 endpoints)
- Multi-agent architecture (AgentPort + Orchestrator)
- NLP Sentiment Agent (active)
- 7-day backtesting with real Yahoo Finance prices
- AI strategy generator (GPT-4o-mini + fallback)
- Investor profile onboarding
- Trusted channel ecosystem + recommender
- Frontend pages: Profile, Backtest, Strategies, Agents
- API docs (`API-Reference.md`, `openapi.yml`/`openapi.json`)

**⬜ Next**

1. Connect an external multi-agent system via `ExternalMultiAgent` (HTTP)
2. Implement `KiteBroker` for live NSE/BSE trading (Zerodha)
3. Trading Algo Agent — RSI, MACD, Bollinger Bands
4. Wrap `AnalysisService` as `DeepAnalysisAgent`
5. Frontend polish — strategy apply flow, Recharts backtest charts, live WS updates
6. Deploy — Docker containerization for Render / Railway / Vercel

---

## ⚠️ Known Notes

- **Twitter scraping** depends on Nitter instance availability; falls back to mock posts if scraping fails.
- **GPT-4o-mini** strategy generation needs `OPENAI_API_KEY`; falls back to rule-based strategies otherwise.
- **Yahoo Finance** auto-appends `.NS` for NSE symbols.
- Occasional IDE lint errors on `trustScore` / `InvestHorizon` are just a stale Prisma client cache — `npx prisma generate` + restart clears them (`npx tsc --noEmit` passes clean).

---

## ⚖️ Disclaimer

This is a hackathon project for educational and demonstration purposes. Backtested results are simulated (paper trading) and are **not** financial advice. Do your own research before making any investment decisions.
