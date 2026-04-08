# 📊 Market Sentiment Intelligence - GnosisAlpha

**Real-time social sentiment tracking for traders. Because what people say on Twitter matters.**

Monitor what crypto and stock communities are saying — *right now* — and act before the crowd does.

---

## 🎯 What This Does

You pick an asset (BTC, ETH, TSLA, AAPL, etc.). We watch social media. We tell you:

- **What people are saying** — Posts from Twitter, Reddit, relevant to your assets
- **How they feel** — Sentiment scores (-1 to +1), confidence levels
- **Why it matters** — Is it hype? Insider buzz? Whale movement?
- **Who's talking** — Detect whale activity and unusual patterns
- **Get alerts** — Email notifications when sentiment shifts on your watched assets

No waiting. No noise. Just signal.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│         Frontend (Next.js)                   │
│    Dashboard, Alerts, Asset Tracking         │
└──────────────┬──────────────────────────────┘
               │
┌──────────────┴──────────────────────────────┐
│         HTTP API (NestJS)                    │
│    /api/assets, /posts, /preferences        │
└──────────────┬──────────────────────────────┘
               │
┌──────────────┴──────────────────────────────┐
│  PostgreSQL + Redis (Queue System)           │
├──────────────┬──────────────────────────────┤
│  Worker 1    │      Worker 2                │
│  - Poll      │   - Sentiment               │
│    Twitter   │   - Whale Detection         │
│  - Ingest    │   - Alerts                  │
│    Posts     │                              │
└──────────────┴──────────────────────────────┘
```

**Key design**: 
- API and workers run separately — don't block each other
- Posts flow through a queue: *Ingest → Store → Analyze → Alert*
- Polling every 30–60 seconds (not streaming)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Docker (optional, but recommended)

### Setup

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd Market-Sentimental-Analysis-Pjt
   npm install
   ```

2. **Environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/market_sentiment
   REDIS_HOST=localhost
   REDIS_PORT=6379
   JWT_SECRET=your_secret_key
   SMTP_HOST=your_email_provider
   SMTP_USER=your_email
   SMTP_PASS=your_app_password
   ```

3. **Run migrations**
   ```bash
   npx prisma migrate dev
   npx prisma db seed  # Optional: seeds demo assets
   ```

4. **Start the API server**
   ```bash
   npm run start:dev
   ```
   Open http://localhost:3001

5. **In another terminal, start the worker**
   ```bash
   npm run start:worker
   ```

---

## 🎮 Core Endpoints

### Assets (What to Track)
- `POST /api/assets` — Create a new asset (ADMIN)
- `GET /api/assets` — List all available assets
- `GET /api/assets/tracked/me` — Your watched assets
- `POST /api/assets/add` — Track an asset now
- `DELETE /api/assets/remove` — Stop tracking

### Posts (What People Are Saying)
- `GET /api/posts?assetId=BTC&source=TWITTER` — Get posts for an asset
- `GET /api/posts/:id` — Single post + sentiment breakdown
- `POST /api/posts` — Manually add a post (testing)

### Preferences (Your Settings)
- `GET /api/preferences` — All your tracked assets + settings
- `POST /api/preferences` — Update tracking preferences
- `PATCH /api/preferences/:assetId/toggle-alert` — Turn alerts on/off

### Alerts (Notifications)
- `GET /api/alerts` — Your alert history
- `PATCH /api/alerts/:id/read` — Mark as read

### Analysis (Deep Dives)
- `POST /api/analysis` — Get LLM-powered breakdown of a post (on-demand only)

---

## 📁 Project Structure

```
.
├── backend/                    # NestJS API + Workers
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/          # JWT + login
│   │   │   ├── assets/        # Stock/crypto tracking
│   │   │   ├── posts/         # Feed + ingestion
│   │   │   ├── sentiment/     # NLP analysis
│   │   │   ├── alerts/        # Email + notifications
│   │   │   ├── channels/      # Social sources config
│   │   │   ├── fetcher/       # Polling service
│   │   │   └── workers/       # Queue consumers
│   │   ├── worker.ts          # Entry point for worker process
│   │   └── main.ts            # Entry point for API
│   ├── prisma/                # Database schema
│   └── package.json
├── frontend/                  # Next.js Dashboard
│   ├── app/
│   │   ├── dashboard/         # Main UI
│   │   ├── auth/              # Login/signup
│   │   └── settings/          # User config
│   └── components/
├── docker-compose.yml         # SQL + Redis
└── README.md

```

---

## 🔄 How Data Flows

1. **Worker polls** → Fetches latest posts from Twitter/Reddit every 30s
2. **Posts queued** → Stores post in DB, puts job on queue
3. **Sentiment analyzed** → NLP runs, scores sentiment (-1 = bearish, +1 = bullish)
4. **Whale detected** → Checks if post is from influence accounts
5. **Alerts sent** → If sentiment crosses user thresholds, email goes out
6. **Dashboard updates** → Real-time feed shows new posts + scores

---

## 📦 Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS |
| **Backend API** | NestJS, TypeScript, Fastify/Express |
| **Database** | PostgreSQL, Prisma ORM |
| **Queue** | Redis, BullMQ |
| **Workers** | Node.js (headless) |
| **Auth** | JWT, PassportJS |
| **Sentiment** | Default: Fast NLP (can swap for transformer models) |
| **Email** | Nodemailer / SendGrid |

---

## 🚧 Roadmap

- [ ] Real Twitter API integration (currently mock data)
- [ ] Reddit API integration
- [ ] Custom sentiment models (fine-tuned on crypto language)
- [ ] Telegram channel monitoring
- [ ] Advanced whale tracking (on-chain data)
- [ ] User-defined alert strategies (no-code builder)
- [ ] Historical sentiment trends + exports

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-idea`)
3. Commit your changes (`git commit -m 'Add your idea'`)
4. Push to the branch (`git push origin feature/your-idea`)
5. Open a Pull Request

---

## 💬 Questions?

Open an issue or reach out to the team. We read everything.

---

**Built for traders who want the edge. 📈**
