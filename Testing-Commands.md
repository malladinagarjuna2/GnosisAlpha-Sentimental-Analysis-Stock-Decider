# Market Sentiment Intelligence — Testing Commands (PowerShell)

> Run these commands in order. Each step builds on the previous one.
> Make sure the HTTP server (`npm run start:dev`) and worker (`npm run start:worker`) are running.

---

## Step 1 — Health Check

Verify the server is running.

```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/health
```

**Expected:** `{ status: "ok", service: "market-sentiment-api", ... }`

---

## Step 2 — Signup

Create a new user account.

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/auth/signup `
  -ContentType "application/json" `
  -Body '{"email": "test@example.com", "password": "Test1234!", "name": "Test User"}'
```

**Expected:** Returns `accessToken` + `user` object.

---

## Step 3 — Login

Login and store the token for all future requests.

```powershell
$login = Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/auth/login `
  -ContentType "application/json" `
  -Body '{"email": "test@example.com", "password": "Test1234!"}'

$token = $login.accessToken
$token
```

**Expected:** Prints a long JWT string. All commands below use `$token`.

---

## Step 4 — Get My Profile

Verify the logged-in user.

```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/users/me `
  -Headers @{ Authorization = "Bearer $token" }
```

**Expected:** Returns user object with `id`, `email`, `name`.

---

## Step 5 — List All Assets

See what assets are available to track.

```powershell
$assets = Invoke-RestMethod -Uri http://localhost:3001/api/assets

$assets | Select-Object id, symbol, name, type | Format-Table
```

**Expected:** Table with BTC, ETH, SOL, TSLA, AAPL.

---

## Step 6 — Track Assets

Add assets to your watchlist. Alerts only fire for tracked assets.

```powershell
# Track all 5 assets
foreach ($asset in $assets) {
  Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/assets/add `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" `
    -Body "{`"assetId`": `"$($asset.id)`"}"
  Write-Host "Tracked: $($asset.symbol)"
}
```

**Expected:** "Tracked: BTC", "Tracked: ETH", etc.

---

## Step 7 — Verify Tracked Assets

```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/assets/tracked/me `
  -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 2
```

**Expected:** Array of 5 tracked assets.

---

## Step 8 — Get Preferences

Check alert toggle status for each tracked asset.

```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/preferences `
  -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 3
```

**Expected:** Array of preferences with `alertEnabled: true` for each asset.

---

## Step 9 — Toggle Alert Off/On for an Asset

```powershell
# Toggle alert off for first asset
$firstAssetId = $assets[0].id

Invoke-RestMethod -Method Patch `
  -Uri "http://localhost:3001/api/preferences/$firstAssetId/toggle-alert" `
  -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json
```

**Expected:** Returns preference with `alertEnabled: false`. Run again to toggle back to `true`.

---

## Step 10 — List Default Channels

See which social channels are available to follow.

```powershell
$channels = Invoke-RestMethod -Uri http://localhost:3001/api/channels `
  -Headers @{ Authorization = "Bearer $token" }

$channels.defaults | Select-Object id, platform, handle, displayName | Format-Table
```

**Expected:** Table with elonmusk, POTUS, VitalikButerin, etc.

---

## Step 11 — Follow Channels

Follow default channels so the fetcher pulls real tweets.

```powershell
# Follow all default channels
foreach ($ch in $channels.defaults) {
  Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/channels/follow `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" `
    -Body "{`"channelId`": `"$($ch.id)`"}"
  Write-Host "Followed: @$($ch.handle)"
}
```

**Expected:** "Followed: @elonmusk", "Followed: @POTUS", etc.

---

## Step 12 — Add a Custom Channel

Add a Twitter account that isn't in the defaults.

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/channels/custom `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"platform": "TWITTER", "handle": "@CoinBureau", "displayName": "Coin Bureau"}' | ConvertTo-Json
```

**Expected:** Returns the created channel object. Auto-followed.

---

## Step 13 — Verify Followed Channels

```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/channels/followed `
  -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 2
```

**Expected:** Array of all channels you're following.

---

## Step 14 — Unfollow a Channel

```powershell
# Unfollow the first channel
$followed = Invoke-RestMethod -Uri http://localhost:3001/api/channels/followed `
  -Headers @{ Authorization = "Bearer $token" }

Invoke-RestMethod -Method Delete -Uri http://localhost:3001/api/channels/unfollow `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body "{`"channelId`": `"$($followed[0].id)`"}"
```

**Expected:** `{ "message": "Unfollowed successfully" }`

---

## Step 15 — Set Strategy (Low Thresholds for Testing)

Lower thresholds so alerts trigger on almost every post.

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/strategies/strategy/update `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"impactThreshold": 5, "confidenceThreshold": 0.1, "sentimentThreshold": 0.05}' | ConvertTo-Json -Depth 2
```

**Expected:** Returns strategy object with updated thresholds.

---

## Step 16 — Get Current Strategy

```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/strategies/strategy `
  -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 2
```

**Expected:** Shows your active strategy config with the low thresholds.

---

## Step 17 — Manually Create a Post

Insert a test post to trigger the sentiment pipeline.

```powershell
$body = @{
  assetId = $assets[0].id
  source  = "TWITTER"
  content = "Bitcoin is going to the moon! Massive whale just bought 10000 BTC. Extremely bullish!"
  author  = "test_user"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/posts `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body $body | ConvertTo-Json -Depth 2
```

**Expected:** Returns created post. Check worker logs for sentiment processing.

---

## Step 18 — Get Posts (with Filters)

```powershell
# All posts (latest 20)
Invoke-RestMethod -Uri "http://localhost:3001/api/posts?limit=20" `
  -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 3

# Filter by asset
Invoke-RestMethod -Uri "http://localhost:3001/api/posts?assetId=$($assets[0].id)&limit=10" `
  -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 3

# Filter by source
Invoke-RestMethod -Uri "http://localhost:3001/api/posts?source=TWITTER&limit=10" `
  -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 3
```

**Expected:** Array of posts with nested `sentiment` and `asset` objects.

---

## Step 19 — Get a Single Post

```powershell
$posts = Invoke-RestMethod -Uri "http://localhost:3001/api/posts?limit=1" `
  -Headers @{ Authorization = "Bearer $token" }

$postId = $posts[0].id

Invoke-RestMethod -Uri "http://localhost:3001/api/posts/$postId" `
  -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 3
```

**Expected:** Single post with full sentiment details.

---

## Step 20 — Deep LLM Analysis

Run on-demand AI analysis on a post.

```powershell
$posts = Invoke-RestMethod -Uri "http://localhost:3001/api/posts?limit=1" `
  -Headers @{ Authorization = "Bearer $token" }

Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/analysis/deep `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body "{`"postId`": `"$($posts[0].id)`"}" | ConvertTo-Json -Depth 2
```

**Expected:** Returns `summary`, `sentiment`, `reasoning`, `keyThemes`, `riskLevel`, `recommendation`. Returns mock analysis if OpenAI key not configured.

---

## Step 21 — Whale Detection

Manually check if a post looks like whale activity.

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/whale/check `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"content": "Whale alert! 5000 BTC just moved from unknown wallet", "authorFollowers": 500000, "retweetCount": 5000, "likeCount": 20000}' | ConvertTo-Json
```

**Expected:** `{ isWhale: true, reason: "...", confidenceBoost: 0.15 }`

---

## Step 22 — Check Alerts

Wait ~30 seconds for the fetcher to poll and alerts to fire, then check.

```powershell
$alerts = Invoke-RestMethod -Uri http://localhost:3001/api/alerts `
  -Headers @{ Authorization = "Bearer $token" }

$alerts | Select-Object id, type, message, createdAt | Format-Table -Wrap

# Full details
$alerts | ConvertTo-Json -Depth 3
```

**Expected:** Array of IN_APP alerts with sentiment details in metadata.

---

## Step 23 — WebSocket Test (Browser Console)

Open your browser at `http://localhost:3000` (or any page), open DevTools Console, and paste:

```javascript
// Load Socket.IO client (CDN)
var script = document.createElement('script');
script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
script.onload = function() {
  var socket = io('http://localhost:3001');

  socket.on('connect', function() {
    console.log('Connected! Socket ID:', socket.id);
  });

  socket.on('new-post', function(data) {
    console.log('NEW POST:', data);
  });

  socket.on('new-sentiment', function(data) {
    console.log('NEW SENTIMENT:', data);
  });

  socket.on('new-alert-broadcast', function(data) {
    console.log('NEW ALERT:', data);
  });

  socket.on('disconnect', function() {
    console.log('Disconnected');
  });
};
document.head.appendChild(script);
```

**Expected:** Every 30 seconds when the fetcher polls, you'll see `NEW POST` and `NEW SENTIMENT` messages. If thresholds are low, you'll also see `NEW ALERT`.

---

## Step 24 — Update Strategy (Production-like Thresholds)

After testing, set realistic thresholds.

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/strategies/strategy/update `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"impactThreshold": 70, "confidenceThreshold": 0.6, "sentimentThreshold": 0.2, "keywordsPositive": ["bullish", "moon", "breakout"], "keywordsNegative": ["crash", "dump", "bearish"]}' | ConvertTo-Json -Depth 2
```

**Expected:** Only high-impact, high-confidence posts will trigger alerts now.

---

## What to Look For in Worker Logs

After running the above commands, your worker terminal should show a chain like:

```
[FetcherService]      📥 Polled 6 channels — enqueued 12 posts
[PostWorker]          ⚙️  job=1 asset=BTC
[PostWorker]          💾 Post stored [uuid]
[PostWorker]          📤 Post [uuid] → sentimentQueue
[SentimentWorker]     🧠 job=1 post=uuid
[SentimentWorker]     ✅ Sentiment stored [uuid] — score=0.55 impact=67 category=SOCIAL_BUZZ whale=false
[SentimentWorker]     🔍 Evaluate user=[uuid] shouldAlert=true
[AlertsService]       Alert [IN_APP] created for user uuid
[SentimentWorker]     🔔 Alert triggered for user [uuid]
[EmailService]        📧 Email sent to user@gmail.com      ← only if SMTP configured
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `401 Unauthorized` | Re-run Step 3 (login) to refresh `$token` |
| `404 Not Found` | Check the URL has `/api/` prefix |
| No alerts firing | Lower thresholds (Step 15) and track assets (Step 6) |
| No posts appearing | Make sure worker is running (`npm run start:worker`) |
| Email not sending | Set `SMTP_PASS` to Gmail App Password (not regular password) |
| Twitter fetch failing | Check `TWITTER_BEARER_TOKEN` in `.env`, may be rate-limited |
| WebSocket not connecting | Make sure HTTP server is running, check CORS origin |
