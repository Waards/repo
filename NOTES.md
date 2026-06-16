# Pulse — Technical Assessment Notes

## Phase 1 — Make it Run

**Bugs identified and fixed:**

1. **Poll heartbeat updates every row, not just the caller**
   - `app/api/poll/route.ts`: The heartbeat query used `where: {}`, which refreshed `lastSeen` for **all** presence rows on every poll. This meant stale dots never expired — they stayed on the map indefinitely (the exact bug mentioned in the README).
   - Fix: Changed to `where: { id }` so only the caller's row is updated.

2. **Chat message type mismatch**
   - `lib/webrtc.ts`: `sendChat()` sent `{ t: "msg", text }` but `wireDataChannel` checked for `msg.t === "chat"`. Chat messages were silently dropped.
   - Fix: Changed the send to `{ t: "chat", text }` to match the handler.

3. **`end` signal doesn't clear the `busy` flag**
   - `app/api/signal/route.ts`: Only `decline` freed the `busy` flag. When a connection ended via `end`, both peers remained marked as busy and could never accept new connections. Their dots also appeared at 35% opacity permanently.
   - Fix: Added `|| signalType === "end"` to the busy-clearing branch.

4. **ICE pending candidates flushed before `setRemoteDescription`**
   - `lib/webrtc.ts`: `flushPendingCandidates()` was called before `setRemoteDescription()`, but `addIceCandidate` requires a remote description to be set. These candidates were silently dropped, causing WebRTC connections to fail on some networks.
   - Fix: Swapped the order — `setRemoteDescription` first, then flush.

## Phase 2 — Make it Good

**UI/UX redesign:**

- **EntryGate**: Added animated particle background (canvas-based floating dots), subtle entrance animations, an icon badge, and refined typography. The "Enter Pulse" button now has a spinner during location lookup.
- **WorldMap**: Replaced Mapbox GL JS with **MapLibre GL JS** using free CARTO dark-matter tiles — no API key required. Dots use the `pulse-ring` animation. Added "Tap a dot to connect" hint. The "Me" pin floats gently.
- **ConnectionPrompt**: Polished modal with icon, slide-up animation, and active-scale feedback on buttons.
- **ChatPanel**: Collapsible sidebar (minimizes to a floating button). Bubbles have fade-in animation. Send button uses an icon. Empty state has an icon. Scrollbar styling.
- **VideoPanel**: Added "Live" badge with pulsing indicator. Local video pip has rounded corners and shadow. Loading spinner while waiting for remote video.
- **Overall**: Dark theme refined with CSS custom properties, smooth animations throughout (`fade-in`, `slide-up`, `glow`), custom scrollbar, glassmorphism for overlays, consistent active-scale feedback on all buttons.

## Phase 3 — Make it Secure

**Issues found (ranked by severity):**

1. **No rate limiting** (High) — API endpoints could be hammered, enabling abuse.
   - Fix: Added in-memory rate limiter in `lib/security.ts` — 30 requests per 10s window per IP (best-effort on Vercel serverless).
2. **No session ID validation** (High) — `id` was only length-checked, not format-validated.
   - Fix: Added UUID v4 regex validation (`isValidSessionId()`) to all API routes.
3. **No request body size limits** (Medium) — Large payloads could exhaust memory.
   - Fix: Added `MAX_BODY_BYTES = 100_000` check to POST routes (join, signal). The signal endpoint already had per-payload limits.
4. **Mapbox token exposed client-side** (Low) — Expected for public tokens, but now moot since we switched to MapLibre with free tiles.
5. **Session IDs in query strings** (Low) — Exposed in server logs, but sessions are anonymous and ephemeral — acceptable by design.

**What I'd fix next with more time:** A distributed rate limiter (Redis/Upstash), CSRF tokens, and CORS hardening for production deployment.

## Phase 4 — Make it Better

**Feature: Pulse Events (Connection Ripples)**

I built a **live activity visualization** that makes the globe feel alive. When two strangers successfully connect, the server records a `PulseEvent` with their locations. All online users see animated ripple rings expand outward from those locations on the map — the "pulse" of the app.

**How it works:**
- New `PulseEvent` Prisma model stores ephemeral connection events (lat, lng, timestamp)
- When an `accept` signal is processed (`/api/signal` route), both peers' locations are recorded as PulseEvents
- The poll endpoint (`/api/poll`) returns recent PulseEvents (within the last 8 seconds) and cleans up expired ones
- The client renders animated ripple markers at those coordinates using CSS animations

**Design decisions:**
- PulseEvents are ephemeral (8s TTL) — they auto-clean during the next poll cycle
- No new dependencies — reuses existing Prisma and MapLibre infrastructure
- Minimal data footprint — just lat, lng, and timestamp

**What I'd do next:** Add a global activity counter showing "X connections in the last minute", and a subtle ambient sound when a pulse appears near the user's location.
