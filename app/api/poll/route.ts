import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { STALE_MS, SIGNAL_TTL_MS, PULSE_TTL_MS } from "@/lib/presence";
import type { PollResponse } from "@/lib/types";
import { checkRateLimit, isValidSessionId } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(request);
  if (!rate.ok) {
    return Response.json({ error: "too many requests" }, { status: 429 });
  }

  const params = request.nextUrl.searchParams;
  const id = params.get("id");

  if (!isValidSessionId(id)) {
    return Response.json({ error: "missing or invalid id" }, { status: 400 });
  }

  const now = Date.now();
  const staleCutoff = new Date(now - STALE_MS);
  const signalCutoff = new Date(now - SIGNAL_TTL_MS);
  const pulseCutoff = new Date(now - PULSE_TTL_MS);

  // 1) Heartbeat — refresh lastSeen for the caller only.
  await prisma.presence.updateMany({
    where: { id },
    data: { lastSeen: new Date(now) },
  });

  // 2) Reap stale presence rows, orphaned signals, and expired pulse events.
  await prisma.presence.deleteMany({ where: { lastSeen: { lt: staleCutoff } } });
  await prisma.signal.deleteMany({ where: { createdAt: { lt: signalCutoff } } });
  await prisma.pulseEvent.deleteMany({ where: { createdAt: { lt: pulseCutoff } } });

  // 3) Online peers, excluding self.
  const peers = await prisma.presence.findMany({
    where: {
      id: { not: id },
      lastSeen: { gte: staleCutoff },
    },
    select: { id: true, lat: true, lng: true, busy: true },
  });

  // 4) Drain this user's mailbox.
  const inbox = await prisma.signal.findMany({
    where: { toId: id },
    orderBy: { createdAt: "asc" },
  });
  if (inbox.length > 0) {
    await prisma.signal.deleteMany({
      where: { id: { in: inbox.map((s) => s.id) } },
    });
  }

  // 5) Recent pulse events for the map ripple effect.
  const pulses = await prisma.pulseEvent.findMany({
    where: { createdAt: { gte: pulseCutoff } },
    orderBy: { createdAt: "asc" },
  });

  const response: PollResponse = {
    peers: peers.map((p) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      busy: p.busy,
    })),
    signals: inbox.map((s) => ({
      id: s.id,
      fromId: s.fromId,
      toId: s.toId,
      type: s.type as PollResponse["signals"][number]["type"],
      payload: s.payload,
      createdAt: s.createdAt.toISOString(),
    })),
    pulses: pulses.map((p) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      createdAt: p.createdAt.toISOString(),
    })),
  };

  return Response.json(response);
}
