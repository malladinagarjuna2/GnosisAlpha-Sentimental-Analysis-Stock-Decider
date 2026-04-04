# Deep Analysis — Postman Testing Guide

> Base URL: `http://localhost:3001/api`
> All `/analysis/*` routes require `Authorization: Bearer <token>`

---

## Auth (get your token first)

### POST /api/auth/login
```
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test1234!"
}
```
Copy `accessToken` from the response and set it as a Bearer token in Postman's Authorization tab (or use the environment variable approach below).

---

## Deep Analysis Endpoints

### Route: `POST /api/analysis/deep`

The controller accepts two modes via the same endpoint:

| Field    | Type   | Required?             | Description                        |
|----------|--------|-----------------------|------------------------------------|
| `postId` | string | One of the two        | Analyze an existing post by its DB id |
| `text`   | string | One of the two        | Analyze raw text directly          |
| `asset`  | string | Optional (with `text`)| Asset symbol hint e.g. `BTC`, `TSLA` |

Logic: if `text` is present → `deepAnalyzeText(text, asset)`. Otherwise → `deepAnalyze(postId)`.

---

### Mode 1 — Analyze by Post ID

```
POST http://localhost:3001/api/analysis/deep
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "postId": "PASTE_A_POST_ID_HERE"
}
```

**How to get a postId:**
```
GET http://localhost:3001/api/posts?limit=1
Authorization: Bearer {{token}}
```
Copy the `id` from the first result.

---

### Mode 2 — Analyze Raw Text (no post needed)

```
POST http://localhost:3001/api/analysis/deep
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "text": "Bitcoin is going to the moon! Massive whale just bought 10000 BTC. Extremely bullish!",
  "asset": "BTC"
}
```

```
POST http://localhost:3001/api/analysis/deep
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "text": "TSLA is crashing hard, CEO just dumped shares. Run while you can.",
  "asset": "TSLA"
}
```

```
POST http://localhost:3001/api/analysis/deep
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "text": "Ethereum merge was a disaster lol, network is totally fine though right? 😂",
  "asset": "ETH"
}
```

---

## Response Schema

```json
{
  "postId": "text-1712345678901",
  "summary": "BTC post with bullish signals...",
  "sentiment": "BULLISH",          // "BULLISH" | "BEARISH" | "NEUTRAL"
  "sentimentScore": 0.72,          // -1 to 1
  "reasoning": "Strong momentum keywords detected...",
  "keyThemes": ["whale", "moon", "bullish"],
  "riskLevel": "LOW",              // "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN"
  "recommendation": "Monitor for confirmation before acting.",
  "confidenceScore": 0.81,         // 0 to 1
  "analyzedAt": "2026-04-04T10:00:00.000Z",
  "pipelineStatus": "full",        // "full" | "partial" | "mock"
  "agentTrace": {
    "agent1": {
      "asset": "BTC",
      "relevanceScore": 0.9,
      "tweetType": "hype",
      "sentimentScore": 0.72,
      "matchedKeywords": ["moon", "whale", "bullish"],
      "confidence": 0.85
    },
    "agent2": {
      "sarcasmDetected": false,
      "ironyDetected": false,
      "pumpAndDumpSignals": false,
      "misleadingSignals": [],
      "emotionalManipulation": false,
      "riskFlags": [],
      "adjustedConfidence": 0.81,
      "riskLevel": "LOW"
    },
    "agent3": {
      "summary": "...",
      "reasoning": "...",
      "keySignals": ["moon", "whale"],
      "recommendation": "..."
    }
  },
  "security": {
    "verified": false,
    "planValidated": false,
    "outputVerified": false,
    "circuitOpen": false,
    "auditTrail": [
      { "action": "verification_bypassed", "result": "bypassed", "timestamp": "..." }
    ]
  }
}
```

---

## Pipeline — What Happens Inside

```
POST /api/analysis/deep
        │
        ▼
  [ArmorIQ] capturePlan() → intentToken (if ARMORIQ_API_KEY configured)
        │
        ▼
  [Agent 1 — Gemini]
    Classifies: asset, relevanceScore, tweetType, sentimentScore,
                matchedKeywords, confidence
        │
        ▼
  [Agent 2 — OpenAI gpt-4o-mini]
    Detects: sarcasm, irony, pumpAndDump, misleadingSignals,
             emotionalManipulation, riskFlags, adjustedConfidence, riskLevel
        │
        ▼
  [Agent 3 — Gemini]
    Generates: summary, reasoning, keySignals, recommendation
        │
        ▼
  [Code — no LLM]
    Computes: final sentiment label, confidenceScore, keyThemes, pipelineStatus
        │
        ▼
  Returns DeepAnalysisResult
```

- If any agent fails, it uses a safe default and sets `pipelineStatus: "partial"`
- If confidence < 0.25 on partial, status becomes `"mock"`
- ArmorIQ is optional — bypassed gracefully if unconfigured

---

## Postman Environment Setup (recommended)

| Variable  | Value                          |
|-----------|-------------------------------|
| `baseUrl` | `http://localhost:3001/api`   |
| `token`   | (set after login)             |

In your login request, add a **Tests** script:
```javascript
const res = pm.response.json();
pm.environment.set("token", res.accessToken);
```

Then in all analysis requests use:
- URL: `{{baseUrl}}/analysis/deep`
- Auth: `Bearer {{token}}`

---

## Common Errors

| Status | Meaning                                       | Fix                                     |
|--------|-----------------------------------------------|-----------------------------------------|
| 401    | Missing or expired token                      | Re-login and update `token`             |
| 404    | `postId` not found in DB                      | Use a real post id from GET /api/posts  |
| 400    | Body validation failed (bad field types)      | Check field names match the DTO         |
| 500    | LLM provider error (API key missing/wrong)    | Check `.env` for GEMINI_API_KEY / OPENAI_API_KEY |
