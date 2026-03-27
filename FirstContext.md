You are building a full-stack hackathon project called “Market Sentiment Intelligence”.

This is a near real-time platform for traders and crypto users.

Core idea:
- Users select stocks or crypto assets
- The system monitors social sources like X (Twitter) and optionally Reddit
- It polls data every 30–60 seconds (not real-time streaming)
- It detects posts relevant to selected assets
- It performs sentiment analysis and produces structured output:
  - sentiment_score (-1 to 1)
  - impact_score (0 to 100)
  - confidence
  - category (SOCIAL_BUZZ, NEWS, RUMOR, WHALE_ACTIVITY)
  - reason

Key features:
- Authentication system
- Asset tracking (stocks/crypto)
- Source monitoring
- Sentiment analysis engine (default fast NLP)
- Configurable strategy system (user-defined weights, thresholds)
- Whale activity detection (simple threshold-based)
- Email alert system
- Dashboard UI
- LLM-based deep analysis (ONLY on-demand when user clicks a post)

Important constraints:
- Do NOT run LLM automatically for every post
- Use polling instead of streaming
- Keep system modular and scalable
- Design so future custom user algorithms can be added (but DO NOT implement raw code execution now)

Architecture:
- Backend: Node.js (NestJS preferred), PostgreSQL, Prisma
- Queue: Redis + BullMQ
- Worker system for ingestion + sentiment
- Frontend: Next.js

Goal:
- Build a clean, working, hackathon-ready system
- Prioritize backend design + modularity
- Keep frontend simple but polished

Always follow clean architecture and modular design.
Do not overcomplicate.

Acknowledge this context and then wait for step-by-step instructions.