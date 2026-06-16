# Pulse

A living globe of anonymous strangers. Every online user is a dot on a world map — tap one to connect for text chat or a video call. No accounts, no history, nothing stored.

## How it works

- **Coordination** runs on the server: live presence and WebRTC signaling, stored transiently in Postgres (via Prisma) and delivered by short HTTP polling.
- **Chat and video** are peer-to-peer over WebRTC (data channel + media). They never touch the server.
- **Map** uses MapLibre GL JS with free CARTO dark raster tiles — no API key required.
- **Privacy**: every dot is placed 1–3 km from the user's real location, randomized each session.

## Tech stack

- **Next.js 16** (App Router, Webpack)
- **Postgres** via Prisma 7 (Neon)
- **MapLibre GL JS** (free map tiles)
- **WebRTC** (peer-to-peer chat + video)

## Getting started

```bash
npm install
cp .env.example .env   # add your DATABASE_URL
npx prisma db push
npm run dev
```

Open http://localhost:3000, then open a second browser window to test with two users.

## Phases completed

### Phase 1 — Make it run
Fixed 4 bugs: poll heartbeat updated all rows instead of the caller, chat message type mismatch, `end` signal left peers stuck as busy, and ICE candidates flushed before `setRemoteDescription`.

### Phase 2 — Make it good
Redesigned UI with animated particle EntryGate, polished dark theme, collapsible chat panel, glassmorphism overlays, and smooth transitions throughout.

### Phase 3 — Make it secure
Added rate limiting (30 req/10s per IP), UUID v4 validation on session IDs, request body size limits, and removed the Mapbox dependency (replaced with free MapLibre tiles).

### Phase 4 — Make it better
Built **Pulse Events** — when two strangers connect, the map shows animated ripple rings at their locations, making the globe feel alive.

## Deployment

Deployed on Vercel. Set `DATABASE_URL` in environment variables.
