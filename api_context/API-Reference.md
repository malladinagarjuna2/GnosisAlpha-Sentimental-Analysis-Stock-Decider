# Market Sentiment Intelligence — API Reference

> **Base URL:** `http://localhost:3001/api`
> **WebSocket:** `http://localhost:3001` (Socket.IO)

---

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

Get a token by calling `POST /api/auth/login` or `POST /api/auth/signup`.

---

## 1. Auth

### POST `/api/auth/signup`
Create a new account.

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Min 8 characters |
| `name` | string | No | Display name |

**Response:**
```json
{
  "accessToken": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John"
  }
}
```

---

### POST `/api/auth/login`
Login and get JWT token.

| Field | Type | Required |
|---|---|---|
| `email` | string | Yes |
| `password` | string | Yes |

**Response:**
```json
{
  "accessToken": "eyJhbGci..."
}
```

---

## 2. Users

### GET `/api/users/me` (Auth Required)
Get authenticated user's profile.

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John",
  "isVerified": false,
  "createdAt": "2026-03-31T..."
}
```

---

## 3. Assets

### GET `/api/assets`
List all available assets. **No auth required.**

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Bitcoin",
    "symbol": "BTC",
    "type": "CRYPTO",
    "createdAt": "2026-03-31T...",
    "updatedAt": "2026-03-31T..."
  }
]
```

---

### GET `/api/assets/:id`
Get a single asset. **No auth required.**

**Response:** Single asset object (same shape as above).

---

### GET `/api/assets/tracked/me` (Auth Required)
Get the list of assets the current user is tracking.

**Response:** Array of asset objects.

---

### POST `/api/assets` (Auth Required)
Create a new asset.

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Yes | e.g. "Bitcoin" |
| `symbol` | string | Yes | e.g. "BTC" |
| `type` | enum | Yes | `STOCK` or `CRYPTO` |

**Response:** Created asset object.

---

### POST `/api/assets/add` (Auth Required)
Track an asset (add to user's watchlist).

| Field | Type | Required |
|---|---|---|
| `assetId` | string (UUID) | Yes |

**Response:** UserPreference object.

---

### DELETE `/api/assets/remove` (Auth Required)
Untrack an asset.

| Field | Type | Required |
|---|---|---|
| `assetId` | string (UUID) | Yes |

**Response:** `{ "message": "Asset untracked" }`

---

### POST `/api/assets/:id/track` (Auth Required)
Legacy: track an asset by path param.

### DELETE `/api/assets/:id/track` (Auth Required)
Legacy: untrack an asset by path param. Returns 204 No Content.

---

## 4. Preferences

### GET `/api/preferences` (Auth Required)
Get all user preferences (with asset details).

**Response:**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "assetId": "uuid",
    "alertEnabled": true,
    "asset": { "id": "uuid", "name": "Bitcoin", "symbol": "BTC", "type": "CRYPTO" }
  }
]
```

---

### POST `/api/preferences` (Auth Required)
Create or update a preference.

| Field | Type | Required |
|---|---|---|
| `assetId` | string (UUID) | Yes |
| `alertEnabled` | boolean | No |

**Response:** Updated preference object.

---

### PATCH `/api/preferences/:assetId/toggle-alert` (Auth Required)
Toggle alertEnabled on/off for a specific asset.

**Response:** Updated preference object with `alertEnabled` flipped.

---

## 5. Posts

### GET `/api/posts` (Auth Required)
List posts with optional filters.

| Query Param | Type | Default | Notes |
|---|---|---|---|
| `assetId` | string | - | Filter by asset |
| `source` | enum | - | `TWITTER` or `REDDIT` |
| `limit` | number | 50 | Max posts returned |

**Response:**
```json
[
  {
    "id": "uuid",
    "assetId": "uuid",
    "source": "TWITTER",
    "externalId": "twitter-123456",
    "content": "Bitcoin is looking bullish today!",
    "author": "cryptowhale_99",
    "url": "https://twitter.com/...",
    "postedAt": "2026-03-31T...",
    "createdAt": "2026-03-31T...",
    "asset": { "id": "uuid", "name": "Bitcoin", "symbol": "BTC", "type": "CRYPTO" },
    "sentiment": {
      "id": "uuid",
      "postId": "uuid",
      "sentimentScore": 0.55,
      "impactScore": 67,
      "confidence": 0.75,
      "category": "SOCIAL_BUZZ",
      "reason": "Matched 2 keyword(s): +bullish, +breaking",
      "isWhaleAlert": false,
      "analyzedBy": "NLP"
    }
  }
]
```

---

### GET `/api/posts/asset/:assetId` (Auth Required)
List posts for a specific asset.

| Query Param | Type | Default |
|---|---|---|
| `limit` | number | 50 |

**Response:** Array of post objects (same shape as above, without `asset` include).

---

### GET `/api/posts/:id` (Auth Required)
Get a single post with sentiment + asset details.

**Response:** Single post object.

---

### POST `/api/posts` (Auth Required)
Manually insert a post (for testing).

| Field | Type | Required | Notes |
|---|---|---|---|
| `assetId` | string | Yes | Must be valid asset UUID |
| `source` | enum | Yes | `TWITTER` or `REDDIT` |
| `content` | string | Yes | Post text |
| `author` | string | No | Defaults to "manual-entry" |
| `url` | string | No | Source URL |
| `postedAt` | string (ISO) | No | Defaults to now |

**Response:** Created post object.

---

## 6. Sentiment

### POST `/api/sentiment/analyze-llm/:postId` (Auth Required)
Trigger LLM analysis for a post (legacy endpoint).

| Field | Type | Required |
|---|---|---|
| `text` | string | Yes |

**Response:** LLM analysis result.

---

## 7. Analysis (Deep)

### POST `/api/analysis/deep` (Auth Required)
On-demand LLM deep analysis. Only triggered by user action, never automatic.

| Field | Type | Required |
|---|---|---|
| `postId` | string (UUID) | Yes |

**Response:**
```json
{
  "postId": "uuid",
  "summary": "Market post detected with bullish signals.",
  "sentiment": "BULLISH",
  "reasoning": "Strong positive keywords detected in context of BTC price action.",
  "keyThemes": ["market sentiment", "price breakout"],
  "riskLevel": "MEDIUM",
  "recommendation": "Monitor closely for confirmation of breakout.",
  "analyzedAt": "2026-03-31T10:58:43.759Z"
}
```

**Note:** Returns mock analysis if `OPENAI_API_KEY` is not configured. Real analysis uses GPT-4o-mini.

---

## 8. Strategies

### GET `/api/strategies/strategy` (Auth Required)
Get the user's active strategy config. Returns defaults if none exists.

**Response:**
```json
{
  "keywordsPositive": [],
  "keywordsNegative": [],
  "impactThreshold": 70,
  "confidenceThreshold": 0.6,
  "sentimentWeight": 0.5,
  "impactWeight": 0.5,
  "sentimentThreshold": 0.2,
  "categories": ["SOCIAL_BUZZ", "NEWS", "RUMOR", "WHALE_ACTIVITY"]
}
```

---

### POST `/api/strategies/strategy/update` (Auth Required)
Create or update the active strategy. Supports partial updates (only send fields you want to change).

| Field | Type | Required | Range |
|---|---|---|---|
| `keywordsPositive` | string[] | No | Custom positive keywords |
| `keywordsNegative` | string[] | No | Custom negative keywords |
| `impactThreshold` | number | No | 0–100 |
| `confidenceThreshold` | number | No | 0–1 |
| `sentimentWeight` | number | No | 0–1 |
| `impactWeight` | number | No | 0–1 |
| `sentimentThreshold` | number | No | 0–1 |
| `categories` | string[] | No | Array of: `SOCIAL_BUZZ`, `NEWS`, `RUMOR`, `WHALE_ACTIVITY` |

**Response:** Updated strategy object.

---

### GET `/api/strategies` (Auth Required)
List all of the user's strategies.

### GET `/api/strategies/:id` (Auth Required)
Get a single strategy.

### POST `/api/strategies` (Auth Required)
Create a new strategy.

| Field | Type | Required |
|---|---|---|
| `name` | string | Yes |
| `description` | string | No |
| `config` | object | Yes |

### PUT `/api/strategies/:id` (Auth Required)
Update a strategy.

### DELETE `/api/strategies/:id` (Auth Required)
Delete a strategy.

---

## 9. Alerts

### GET `/api/alerts` (Auth Required)
Get all alerts for the current user.

**Response:**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "type": "IN_APP",
    "message": "Sentiment alert — score=0.70, impact=70, category=SOCIAL_BUZZ",
    "metadata": {
      "postId": "uuid",
      "sentimentScore": 0.70,
      "impactScore": 70,
      "category": "SOCIAL_BUZZ",
      "isWhaleAlert": false
    },
    "sentAt": false,
    "createdAt": "2026-03-31T..."
  }
]
```

---

## 10. Channels (Social Media)

### GET `/api/channels` (Auth Required)
List all default channels and user's custom channels.

**Response:**
```json
{
  "defaults": [
    {
      "id": "uuid",
      "platform": "TWITTER",
      "handle": "elonmusk",
      "displayName": "Elon Musk",
      "isDefault": true,
      "createdByUserId": null,
      "createdAt": "2026-03-31T..."
    }
  ],
  "custom": []
}
```

---

### GET `/api/channels/followed` (Auth Required)
List channels the user is currently following.

**Response:** Array of SocialChannel objects.

---

### POST `/api/channels/follow` (Auth Required)
Follow a channel by its UUID. Max 15 channels per user.

| Field | Type | Required |
|---|---|---|
| `channelId` | string (UUID) | Yes |

**Response:** UserChannel object with nested channel.

---

### DELETE `/api/channels/unfollow` (Auth Required)
Unfollow a channel.

| Field | Type | Required |
|---|---|---|
| `channelId` | string (UUID) | Yes |

**Response:** `{ "message": "Unfollowed successfully" }`

---

### POST `/api/channels/custom` (Auth Required)
Add a custom channel and auto-follow it. Max 15 total.

| Field | Type | Required | Notes |
|---|---|---|---|
| `platform` | enum | Yes | `TWITTER` or `REDDIT` |
| `handle` | string | Yes | e.g. `@CoinBureau` or `elonmusk` |
| `displayName` | string | No | Human-readable name |

**Response:** Created SocialChannel object.

---

## 11. Whale Detection

### POST `/api/whale/check` (Auth Required)
Manual whale detection check.

| Field | Type | Required |
|---|---|---|
| `content` | string | Yes |
| `authorFollowers` | number | No |
| `mentionCount` | number | No |
| `retweetCount` | number | No |
| `likeCount` | number | No |

**Response:**
```json
{
  "isWhale": true,
  "reason": "High follower count + whale keywords detected",
  "confidenceBoost": 0.15
}
```

---

## 12. Health Check

### GET `/api/health`
**No auth required.**

**Response:**
```json
{
  "status": "ok",
  "service": "market-sentiment-api",
  "version": "0.1.0",
  "timestamp": "2026-03-31T..."
}
```

---

## WebSocket Events (Socket.IO)

**Connection URL:** `http://localhost:3001`

Connect using Socket.IO client:
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');
```

### Events to Listen For

#### `new-post`
Emitted when a new post is stored in the database.

```json
{
  "postId": "uuid",
  "assetSymbol": "BTC",
  "content": "Bitcoin is looking bullish today! Breaking resistance...",
  "author": "cryptowhale_99"
}
```

#### `new-sentiment`
Emitted when sentiment analysis completes for a post.

```json
{
  "postId": "uuid",
  "sentimentScore": 0.55,
  "impactScore": 67,
  "confidence": 0.75,
  "category": "SOCIAL_BUZZ",
  "isWhaleAlert": false
}
```

#### `new-alert`
Emitted to a specific user's room (`user:{userId}`). Use this for user-specific alert notifications.

```json
{
  "userId": "uuid",
  "alertId": "uuid",
  "message": "Sentiment alert — score=0.70, impact=70, category=SOCIAL_BUZZ",
  "type": "IN_APP",
  "metadata": {
    "postId": "uuid",
    "sentimentScore": 0.70,
    "impactScore": 70,
    "category": "SOCIAL_BUZZ",
    "isWhaleAlert": false
  }
}
```

#### `new-alert-broadcast`
Same as `new-alert` but broadcast to all connected clients (useful for dashboard feeds).

### Subscribing to User-Specific Alerts
To receive alerts targeted at a specific user, join the user's room after connecting:
```javascript
socket.emit('join', `user:${userId}`);
socket.on('new-alert', (data) => {
  console.log('Alert for me:', data);
});
```

---

## Enums Reference

### AssetType
| Value | Description |
|---|---|
| `STOCK` | Stock market asset |
| `CRYPTO` | Cryptocurrency |

### PostSource
| Value | Description |
|---|---|
| `TWITTER` | Twitter / X |
| `REDDIT` | Reddit |

### SocialPlatform
| Value | Description |
|---|---|
| `TWITTER` | Twitter / X |
| `REDDIT` | Reddit |

### SentimentCategory
| Value | Description |
|---|---|
| `SOCIAL_BUZZ` | General social media buzz |
| `NEWS` | News / earnings / regulation |
| `RUMOR` | Speculation / leaks |
| `WHALE_ACTIVITY` | Large holder activity |

### AnalysisMethod
| Value | Description |
|---|---|
| `NLP` | Keyword-based analysis |
| `LLM` | OpenAI GPT analysis |

### AlertType
| Value | Description |
|---|---|
| `IN_APP` | In-app notification |
| `EMAIL` | Email notification |

---

## Error Response Format

All errors follow this shape:

```json
{
  "statusCode": 401,
  "timestamp": "2026-03-31T10:30:52.556Z",
  "path": "/api/analysis/deep",
  "message": {
    "message": "Unauthorized",
    "statusCode": 401
  }
}
```

Common status codes:
- `400` — Validation error (bad request body)
- `401` — Missing or invalid JWT token
- `404` — Resource not found
- `409` — Conflict (e.g. already following channel)
- `500` — Internal server error

---

## Quick Start for Frontend

```javascript
// 1. Signup
const { accessToken } = await fetch('/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@test.com', password: 'Test1234!' }),
}).then(r => r.json());

// 2. Use token for all subsequent requests
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`,
};

// 3. Get assets
const assets = await fetch('/api/assets').then(r => r.json());

// 4. Track an asset
await fetch('/api/assets/add', {
  method: 'POST', headers,
  body: JSON.stringify({ assetId: assets[0].id }),
});

// 5. Get channels & follow one
const { defaults } = await fetch('/api/channels', { headers }).then(r => r.json());
await fetch('/api/channels/follow', {
  method: 'POST', headers,
  body: JSON.stringify({ channelId: defaults[0].id }),
});

// 6. Get posts with sentiment
const posts = await fetch('/api/posts?limit=20', { headers }).then(r => r.json());

// 7. Get alerts
const alerts = await fetch('/api/alerts', { headers }).then(r => r.json());

// 8. Deep analysis on a post
const analysis = await fetch('/api/analysis/deep', {
  method: 'POST', headers,
  body: JSON.stringify({ postId: posts[0].id }),
}).then(r => r.json());

// 9. Connect WebSocket
import { io } from 'socket.io-client';
const socket = io('http://localhost:3001');
socket.on('new-post', (data) => console.log('New post:', data));
socket.on('new-sentiment', (data) => console.log('New sentiment:', data));
socket.on('new-alert-broadcast', (data) => console.log('New alert:', data));
```
