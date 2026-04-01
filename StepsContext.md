# Market Sentiment Intelligence — Implementation Context (Steps 3–11)

## Project Overview
Full-stack hackathon project: "Market Sentiment Intelligence"
- Backend: NestJS + TypeScript + PostgreSQL (Prisma) + Redis (BullMQ)
- Workers run separately from HTTP server
- Mock data fetched every 30s (real API integration planned later)

---

## STEP 3 — Asset + Preferences System

### What was implemented:
- `GET /api/assets` — list all available assets (public)
- `GET /api/assets/:id` — get single asset
- `POST /api/assets` — create asset (authenticated)
- `POST /api/assets/add` — user tracks an asset (body: `{ assetId }`)
- `DELETE /api/assets/remove` — user untracks an asset (body: `{ assetId }`)
- `GET /api/assets/tracked/me` — get current user's tracked assets
- `POST /api/assets/:id/track` — legacy track endpoint
- `DELETE /api/assets/:id/track` — legacy untrack endpoint

### Preferences Module (new):
- `GET /api/preferences` — get all user preferences (with asset details)
- `POST /api/preferences` — create/update preference (body: `{ assetId, alertEnabled? }`)
- `PATCH /api/preferences/:assetId/toggle-alert` — toggle alertEnabled on/off

### Files created/modified:
- `src/modules/preferences/preferences.controller.ts`
- `src/modules/preferences/preferences.service.ts`
- `src/modules/preferences/preferences.module.ts`
- `src/modules/preferences/dto/update-preference.dto.ts`
- `src/modules/assets/assets.controller.ts` — added /add and /remove endpoints
- `src/app.module.ts` — registered PreferencesModule

### DB Relations:
- `UserPreference` — unique on `[userId, assetId]`, has `alertEnabled` toggle
- Cascade delete when user or asset is removed

---

## STEP 4 — Post Model + Basic Feed

### What was implemented:
- `GET /api/posts` — list posts with optional filters: `?assetId=&source=TWITTER&limit=50`
- `GET /api/posts/asset/:assetId` — list posts for a specific asset
- `GET /api/posts/:id` — get single post with sentiment + asset
- `POST /api/posts` — manually insert a post for testing

### Post Model fields:
- `id`, `assetId`, `source` (TWITTER | REDDIT), `externalId` (unique), `content`, `author`, `url`, `postedAt`, `createdAt`
- Includes `sentiment` relation (SentimentResult)

### Files created/modified:
- `src/modules/posts/posts.controller.ts` — added GET /posts with filters, POST /posts
- `src/modules/posts/posts.service.ts` — added `findAll()` with dynamic filters, `create()` for manual insertion
- `src/modules/posts/dto/create-post.dto.ts` — new DTO with validation

### Notes:
- Manual insert auto-generates `externalId` with `manual-{timestamp}-{rand}` prefix
- Verifies asset exists before creating post
- All post endpoints require JWT auth

---

## STEP 5 — Redis + Queue Setup

### Already implemented (no changes needed):
- `src/queue/queue.module.ts` — `@Global()` BullMQ setup, reads `REDIS_HOST`/`REDIS_PORT` from `.env`
- `src/constants/queue.constants.ts` — queue names + job names
- `src/queue/payloads/post-job.payload.ts` — typed payload for postQueue
- `src/queue/payloads/sentiment-job.payload.ts` — typed payload for sentimentQueue

### Queues:
- `post-queue` — raw ingested posts waiting to be stored
- `sentiment-queue` — stored posts waiting for sentiment analysis

### Job names:
- `ingest-post` — fired by FetcherService
- `analyze-sentiment` — fired by PostWorker

---

## STEP 6 — Worker System

### Already implemented (no changes needed):
- `src/worker.ts` — separate entry point, no HTTP server
- `src/worker-app.module.ts` — loads PrismaModule, QueueModule, FetcherModule, WorkersModule
- `src/modules/fetcher/fetcher.service.ts` — polls every 30s, generates 5 mock posts, enqueues to postQueue
- `src/modules/fetcher/seeder.service.ts` — seeds 5 assets (BTC, ETH, SOL, TSLA, AAPL) on startup
- `src/modules/fetcher/mock-post.factory.ts` — generates realistic mock social posts
- `src/modules/workers/post.worker.ts` — consumes postQueue, stores post, runs whale detection, dispatches to sentimentQueue
- `src/modules/workers/sentiment.worker.ts` — consumes sentimentQueue, runs NLP, stores SentimentResult
- `src/modules/workers/workers.module.ts` — aggregates all workers

### Run commands:
```bash
npm run start:dev        # HTTP server (port 3001)
npm run start:worker     # Worker process (separate terminal)
```

### Log chain (what to look for):
```
[FetcherService]    📥 Fetched 5 posts
[FetcherService]    📤 Enqueued [BTC] "..."
[PostWorker]        ⚙️  job=1 asset=BTC
[PostWorker]        💾 Post stored [uuid]
[PostWorker]        📤 Post [uuid] → sentimentQueue
[SentimentWorker]   🧠 job=1 post=uuid
[SentimentWorker]   ✅ Sentiment stored [uuid] — score=0.55 impact=67 category=SOCIAL_BUZZ whale=false
```

---

## STEP 7 — Sentiment Engine

### What was implemented:
Replaced the stub `analyzeWithNlp()` (always returned score=0, impact=50) with a real keyword-based engine.

### Sentiment Score (-1 to 1):
- 30+ positive keywords: `bullish (+0.3)`, `breakout (+0.25)`, `surge (+0.25)`, `moon (+0.25)`, `🚀 (+0.2)`, `📈 (+0.2)`, etc.
- 28+ negative keywords: `bearish (-0.3)`, `crash (-0.3)`, `dump (-0.25)`, `liquidation (-0.25)`, `📉 (-0.2)`, etc.
- Clamped to [-1, 1]

### Confidence (0 to 1):
- `0.3 + matchCount * 0.15`, capped at 0.95
- More keyword matches = higher confidence

### Impact Score (0 to 100):
- Sentiment strength: up to 40 pts
- Author followers: up to 20 pts (scaled to 500k)
- Retweets: up to 25 pts (scaled to 1k)
- Likes: up to 15 pts (scaled to 5k)

### Category Detection:
- `WHALE_ACTIVITY` — whale, massive buy, billion, insider, 🐋
- `RUMOR` — rumor, leak, speculation, allegedly
- `NEWS` — earnings, report, regulation, announcement
- `SOCIAL_BUZZ` — default

### Reason:
- e.g. `"Matched 3 keyword(s): +bullish, +breakout, +🚀"`
- `"No keyword matches — neutral"` if no match

### Files modified:
- `src/modules/sentiment/sentiment.service.ts` — full NLP engine implementation
- `src/queue/payloads/sentiment-job.payload.ts` — added `authorFollowers`, `retweetCount`, `likeCount`
- `src/modules/workers/post.worker.ts` — forwards engagement metrics to sentimentQueue
- `src/modules/workers/sentiment.worker.ts` — passes engagement data to `analyzeWithNlp()`

---

## STEP 8 — Strategy Config

### What was implemented:
User-configurable strategy that controls how sentiment is scored and when alerts fire.

### Strategy Config shape (stored as JSON in DB):
```json
{
  "keywordsPositive": ["bullish", "moon"],
  "keywordsNegative": ["crash", "dump"],
  "impactThreshold": 70,
  "confidenceThreshold": 0.6,
  "sentimentWeight": 0.5,
  "impactWeight": 0.5,
  "sentimentThreshold": 0.2,
  "categories": ["SOCIAL_BUZZ", "NEWS", "RUMOR", "WHALE_ACTIVITY"]
}
```

### Default config (when user has no active strategy):
- `impactThreshold: 70`
- `confidenceThreshold: 0.6`
- All 4 categories enabled

### Endpoints:
- `GET /api/strategies/strategy` — get user's active config (returns defaults if none)
- `POST /api/strategies/strategy/update` — create or update active strategy (partial updates supported)
- `GET /api/strategies` — list all user's strategies
- `GET /api/strategies/:id` — get single strategy
- `POST /api/strategies` — create strategy (full CRUD)
- `PUT /api/strategies/:id` — update strategy
- `DELETE /api/strategies/:id` — delete strategy

### Alert triggering logic (in SentimentWorker):
```
IF confidence >= confidenceThreshold
AND impactScore >= impactThreshold
AND category in config.categories
AND |sentimentScore * sentimentWeight + (impactScore/100) * impactWeight| >= sentimentThreshold
THEN → create IN_APP alert for user
```

### Custom keywords in NLP:
- User's `keywordsPositive` → each match adds +0.2 to sentiment score
- User's `keywordsNegative` → each match adds -0.2 to sentiment score

### Files created/modified:
- `src/modules/strategies/dto/strategy-config.interface.ts` — updated config shape + DEFAULT_STRATEGY_CONFIG
- `src/modules/strategies/dto/update-strategy-config.dto.ts` — new validated DTO
- `src/modules/strategies/strategies.controller.ts` — added /strategy and /strategy/update endpoints
- `src/modules/strategies/strategies.service.ts` — added `getActiveConfig()`, `upsertActive()`, updated `evaluate()`
- `src/modules/sentiment/sentiment.service.ts` — added `customKeywordsPositive`/`customKeywordsNegative` to SentimentInput
- `src/queue/payloads/sentiment-job.payload.ts` — added `trackedByUserIds`
- `src/modules/workers/post.worker.ts` — fetches users tracking the asset, passes `trackedByUserIds`
- `src/modules/workers/sentiment.worker.ts` — loads per-user strategy, passes custom keywords to NLP, fires alerts
- `src/modules/workers/workers.module.ts` — added StrategiesModule + AlertsModule imports

---

## STEP 9 — Alerts (Email + In-App)

### What was implemented:
Alert system that triggers when sentiment analysis meets user strategy thresholds. Supports both in-app alerts (stored in DB) and email alerts (via nodemailer).

### Alert Trigger Logic:
```
IF confidence >= confidenceThreshold
AND impactScore >= impactThreshold
AND category in user's configured categories
THEN → create IN_APP alert + send email (if SMTP configured)
```

### Endpoints:
- `GET /api/alerts` — list all alerts for the authenticated user

### Email Service:
- Uses **nodemailer** with Gmail SMTP
- Only initializes if real SMTP credentials are in `.env`
- Silently skips email if SMTP not configured (IN_APP alerts still created)
- HTML email template with sentiment details

### .env for email:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-16-char-gmail-app-password
```

### Files created/modified:
- `src/modules/alerts/email.service.ts` — wraps nodemailer, graceful fallback
- `src/modules/alerts/alerts.service.ts` — added `markSent()`, injects EmailService
- `src/modules/alerts/alerts.module.ts` — registered ConfigModule + EmailService
- `src/modules/workers/sentiment.worker.ts` — fetches user email, sends email via AlertsService after alert creation

### Worker log chain (when alert fires):
```
[SentimentWorker] 🔍 Evaluate user=[uuid] shouldAlert=true
[AlertsService]   Alert [IN_APP] created for user uuid
[SentimentWorker] 🔔 Alert triggered for user [uuid] on post [uuid]
[EmailService]    📧 Email sent to user@gmail.com     ← only if SMTP configured
```

---

## STEP 10 — LLM Deep Analysis

### What was implemented:
On-demand LLM-powered deep analysis endpoint. NEVER runs automatically — only triggered by explicit API call.

### Endpoint:
- `POST /api/analysis/deep` — body: `{ "postId": "uuid" }` (JWT protected)

### Behavior:
1. Fetches post from DB (404 if not found)
2. Fetches existing NLP result for context
3. Calls **OpenAI GPT-4o-mini** (if `OPENAI_API_KEY` configured)
4. Returns structured analysis JSON
5. Falls back to keyword-based mock analysis if no API key

### Response shape:
```json
{
  "postId": "uuid",
  "summary": "1-2 sentence summary",
  "sentiment": "BULLISH | BEARISH | NEUTRAL",
  "reasoning": "why this sentiment",
  "keyThemes": ["theme1", "theme2"],
  "riskLevel": "LOW | MEDIUM | HIGH",
  "recommendation": "brief action recommendation",
  "analyzedAt": "2026-03-31T..."
}
```

### .env for LLM:
```
OPENAI_API_KEY=sk-your-openai-key    # requires billing credits
```

### Files created:
- `src/modules/analysis/analysis.service.ts` — OpenAI integration with mock fallback
- `src/modules/analysis/analysis.controller.ts` — `POST /analysis/deep`
- `src/modules/analysis/analysis.module.ts` — registered in AppModule
- `src/modules/analysis/dto/deep-analysis.dto.ts` — validated DTO

---

## Social Channels System (added alongside Steps 9–11)

### What was implemented:
Platform-agnostic channel system allowing users to select which social media accounts to follow for post fetching. Supports default (system) channels and user-added custom channels with a max cap of 15.

### DB Models:
- `SocialChannel` — `id`, `platform` (TWITTER | REDDIT), `handle`, `displayName`, `isDefault`, `createdByUserId`
  - Unique on `[platform, handle]`
- `UserChannel` — `id`, `userId`, `channelId`
  - Unique on `[userId, channelId]`

### Endpoints:
- `GET /api/channels` — list all default + user's custom channels
- `GET /api/channels/followed` — list channels the user is following
- `POST /api/channels/follow` — follow a channel by ID (max 15 enforced)
- `DELETE /api/channels/unfollow` — unfollow a channel
- `POST /api/channels/custom` — add a custom handle and auto-follow (body: `{ "platform": "TWITTER", "handle": "@username" }`)

### Default seeded channels:
| Handle | Display Name |
|---|---|
| elonmusk | Elon Musk |
| POTUS | President of the United States |
| Ro_Kum | Ro Kum |
| VitalikButerin | Vitalik Buterin |
| CryptoCred | CryptoCred |
| weekaborkar | Weekend Investing |

### Platform-agnostic architecture:
- `SocialFetcherPort` — abstract interface any platform must implement
  - `fetchByChannel(handle, maxResults, sinceHours)` → `SocialPost[] | null`
  - `isConfigured()` → boolean
- `TwitterFetcherAdapter` — implements the port for Twitter API v2 (Bearer Token auth)
- Future: `RedditFetcherAdapter`, `TelegramFetcherAdapter`, etc.

### Fetcher behavior:
1. Checks if Twitter adapter is configured (`TWITTER_BEARER_TOKEN` in .env)
2. If yes → fetches recent tweets (last 48 hours) from all channels that have at least one follower
3. Matches tweet content to tracked assets using keyword mapping (BTC, ETH, TSLA, etc.)
4. Falls back to mock posts if no real API configured or no channels followed

### .env for Twitter:
```
TWITTER_BEARER_TOKEN=your_bearer_token
```

### Files created/modified:
- `src/modules/fetcher/social-fetcher.port.ts` — platform-agnostic interface
- `src/modules/fetcher/twitter-fetcher.adapter.ts` — Twitter API v2 adapter
- `src/modules/channels/channels.module.ts` — new module
- `src/modules/channels/channels.service.ts` — CRUD + max 15 cap
- `src/modules/channels/channels.controller.ts` — endpoints
- `src/modules/channels/dto/follow-channel.dto.ts` — DTO
- `src/modules/channels/dto/create-channel.dto.ts` — DTO
- `src/modules/fetcher/seeder.service.ts` — seeds default channels on startup
- `src/modules/fetcher/fetcher.service.ts` — rewritten for channel-based fetching
- `src/modules/fetcher/fetcher.module.ts` — added TwitterFetcherAdapter + ChannelsModule
- `src/prisma/prisma.service.ts` — added `socialChannel` + `userChannel` accessors
- `prisma/schema.prisma` — added SocialChannel, UserChannel models, SocialPlatform enum

---

## STEP 11 — WebSockets

### What was implemented:
Real-time WebSocket support using Socket.IO. Workers publish events via Redis pub/sub, the HTTP server's gateway subscribes and emits to connected frontend clients.

### Events emitted:
| Event | When | Payload |
|---|---|---|
| `new-post` | PostWorker stores a new post | `{ postId, assetSymbol, content, author }` |
| `new-sentiment` | SentimentWorker stores analysis | `{ postId, sentimentScore, impactScore, confidence, category, isWhaleAlert }` |
| `new-alert` | SentimentWorker creates alert (to specific user room) | `{ userId, alertId, message, type, metadata }` |
| `new-alert-broadcast` | Same as above (broadcast to all) | Same payload |

### Architecture:
```
Worker process → Redis pub/sub → HTTP server → WebSocket Gateway → Frontend
```

- **Workers** (separate process): use `EventsBridgeService.publish()` to send events to Redis channel `ws-events`
- **HTTP server**: `EventsListenerService` subscribes to Redis, forwards events to `EventsGateway`
- **Gateway**: Socket.IO server, emits to connected clients. User-specific alerts use rooms (`user:{userId}`)

### CORS:
WebSocket gateway uses `FRONTEND_URL` env var (default: `http://localhost:3000`)

### Files created:
- `src/modules/events/events.gateway.ts` — Socket.IO gateway with `emitNewPost()`, `emitNewSentiment()`, `emitNewAlert()`
- `src/modules/events/events-bridge.service.ts` — Redis pub/sub bridge (publish + subscribe)
- `src/modules/events/events-listener.service.ts` — connects Redis subscriber to gateway (HTTP server only)
- `src/modules/events/events.module.ts` — full module for HTTP server (gateway + bridge + listener)
- `src/modules/events/events-worker.module.ts` — worker-only module (bridge only, no gateway)

### Files modified:
- `src/modules/workers/post.worker.ts` — emits `new-post` after storing post
- `src/modules/workers/sentiment.worker.ts` — emits `new-sentiment` after analysis, `new-alert` after alert creation
- `src/app.module.ts` — registered EventsModule
- `src/worker-app.module.ts` — registered EventsWorkerModule

### Frontend testing (browser console):
```javascript
const socket = io('http://localhost:3001');
socket.on('new-post', (data) => console.log('NEW POST:', data));
socket.on('new-sentiment', (data) => console.log('NEW SENTIMENT:', data));
socket.on('new-alert-broadcast', (data) => console.log('NEW ALERT:', data));
```

---

## Environment Setup

### docker-compose.yml services:
- PostgreSQL 16 on port 5432 (user: postgres, password: postgres, db: market_sentiment)
- Redis 7 on port 6379

### .env required values:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/market_sentiment?schema=public"
JWT_SECRET=any_random_strong_string
JWT_EXPIRES_IN=7d
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3001

# Optional — Email alerts
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-gmail-app-password

# Optional — Twitter real post fetching
TWITTER_BEARER_TOKEN=your_bearer_token

# Optional — LLM deep analysis
OPENAI_API_KEY=sk-your-openai-key
```

### Setup commands (one-time):
```bash
docker compose up -d
cd backend
npm install
npx prisma generate
npx prisma migrate dev
```

### Start commands:
```bash
npm run start:dev       # Terminal 1 — HTTP API server
npm run start:worker    # Terminal 2 — Worker process
```

---

## API Base URL
`http://localhost:3001/api`

## Auth
All endpoints except `POST /auth/signup`, `POST /auth/login`, `GET /assets` require:
```
Authorization: Bearer <accessToken>
```

## PowerShell Testing Pattern
```powershell
# Login and save token
$r = Invoke-RestMethod -Method POST -Uri "http://localhost:3001/api/auth/login" -ContentType "application/json" -Body '{"email":"test@test.com","password":"password123"}'
$token = $r.accessToken

# Use token
Invoke-RestMethod -Uri "http://localhost:3001/api/posts?limit=5" -Headers @{Authorization="Bearer $token"}

# POST with body (use hashtable to avoid escaping issues)
$body = @{ assetId = "uuid-here"; source = "TWITTER"; content = "BTC is bullish!" } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "http://localhost:3001/api/posts" -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body $body
```
