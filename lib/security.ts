import type { NextRequest } from "next/server";

// Simple in-memory rate limiter. On Vercel serverless each invocation is
// isolated, so this provides best-effort per-instance limiting. For a
// distributed rate limit a Redis/store-based solution would be needed.
const rateMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX = 30;

export function checkRateLimit(request: NextRequest): {
  ok: boolean;
  remaining: number;
} {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return { ok: false, remaining: 0 };
  }

  return { ok: true, remaining: RATE_LIMIT_MAX - entry.count };
}

// Validate session ID format: must be a UUID v4-like string.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isValidSessionId(id: unknown): id is string {
  return typeof id === "string" && UUID_RE.test(id);
}

export const MAX_BODY_BYTES = 100_000;
