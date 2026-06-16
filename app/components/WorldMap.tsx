"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MaplibreMap, Marker } from "maplibre-gl";
import type { PeerDot, PulseEventData } from "@/lib/types";

function dotColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return `hsl(${Math.abs(hash) % 360}, 65%, 55%)`;
}

const DARK_STYLE = {
  version: 8 as const,
  name: "Dark",
  sources: {
    carto: {
      type: "raster" as const,
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    },
  },
  layers: [
    {
      id: "carto",
      type: "raster" as const,
      source: "carto",
    },
  ],
};

export default function WorldMap({
  peers,
  me,
  pulses,
  onPeerClick,
  canConnect,
}: {
  peers: PeerDot[];
  me: { lat: number; lng: number } | null;
  pulses?: PulseEventData[];
  onPeerClick: (id: string) => void;
  canConnect: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const meMarkerRef = useRef<Marker | null>(null);
  const pulseMarkersRef = useRef<Map<string, Marker>>(new Map());
  const [ready, setReady] = useState(false);

  const onPeerClickRef = useRef(onPeerClick);
  const canConnectRef = useRef(canConnect);
  useEffect(() => {
    onPeerClickRef.current = onPeerClick;
    canConnectRef.current = canConnect;
  });

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    const markers = markersRef.current;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !containerRef.current) return;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: DARK_STYLE,
        center: [0, 20],
        zoom: 1.4,
        attributionControl: false,
      });
      map.on("load", () => {
        if (!cancelled) setReady(true);
      });
      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      markers.forEach((m) => m.remove());
      markers.clear();
      pulseMarkersRef.current.forEach((m) => m.remove());
      pulseMarkersRef.current.clear();
      meMarkerRef.current?.remove();
      meMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !me) return;
    let cancelled = false;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled) return;
      // Fly to user's location smoothly.
      map.flyTo({ center: [me.lng, me.lat], zoom: 4, duration: 1500 });

      if (!meMarkerRef.current) {
        const el = document.createElement("div");
        el.className = "pulse-me";
        el.title = "You are here";
        el.innerHTML = `<span class="pulse-me-label">You</span><span class="pulse-me-dot"></span>`;
        meMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([me.lng, me.lat])
          .addTo(map);
      } else {
        meMarkerRef.current.setLngLat([me.lng, me.lat]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [me, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let cancelled = false;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled) return;
      const markers = markersRef.current;
      const seen = new Set<string>();

      for (const peer of peers) {
        seen.add(peer.id);
        let marker = markers.get(peer.id);
        if (!marker) {
          const el = document.createElement("button");
          el.className = "pulse-dot";
          el.style.background = dotColor(peer.id);
          el.title = peer.busy ? "Busy" : "Tap to connect";
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            if (canConnectRef.current) onPeerClickRef.current(peer.id);
          });
          marker = new maplibregl.Marker({ element: el })
            .setLngLat([peer.lng, peer.lat])
            .addTo(map);
          markers.set(peer.id, marker);
        }
        (marker.getElement() as HTMLElement).style.opacity = peer.busy ? "0.35" : "1";
      }

      for (const [id, marker] of markers) {
        if (!seen.has(id)) {
          marker.remove();
          markers.delete(id);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [peers, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let cancelled = false;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled) return;

      const pulseMarkers = pulseMarkersRef.current;
      const seen = new Set<string>();

      for (const pulse of pulses ?? []) {
        seen.add(pulse.id);
        if (pulseMarkers.has(pulse.id)) continue;

        const el = document.createElement("div");
        el.style.width = "0";
        el.style.height = "0";
        el.style.borderRadius = "50%";
        el.style.border = "2px solid rgba(52, 211, 153, 0.6)";
        el.style.position = "absolute";
        el.style.pointerEvents = "none";
        el.style.animation = "ripple 1.5s ease-out forwards";

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([pulse.lng, pulse.lat])
          .addTo(map);
        pulseMarkers.set(pulse.id, marker);

        setTimeout(() => {
          const m = pulseMarkers.get(pulse.id);
          if (m) {
            m.remove();
            pulseMarkers.delete(pulse.id);
          }
        }, 2000);
      }

      for (const [id, marker] of pulseMarkers) {
        if (!seen.has(id)) {
          marker.remove();
          pulseMarkers.delete(id);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pulses, ready]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />

      <div className="absolute bottom-4 left-4 z-10 rounded-full bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300 backdrop-blur">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 mr-1.5 align-middle" />
        {peers.length} online
      </div>

      {peers.length > 0 && ready && (
        <div className="absolute bottom-4 right-4 z-10 rounded-full bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-500 backdrop-blur">
          Tap a dot to connect
        </div>
      )}
    </div>
  );
}
