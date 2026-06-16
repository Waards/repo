"use client";

import { useEffect, useRef, useState } from "react";

export default function EntryGate({
  onReady,
}: {
  onReady: (lat: number, lng: number) => void;
}) {
  const [status, setStatus] = useState<"idle" | "locating" | "error">("idle");
  const [error, setError] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const dots: { x: number; y: number; r: number; dx: number; dy: number; a: number }[] = [];

    for (let i = 0; i < 80; i++) {
      dots.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.5 + 0.5,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.3,
        a: Math.random() * 0.5 + 0.1,
      });
    }

    let raf: number;
    function draw() {
      ctx!.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.x += d.dx;
        d.y += d.dy;
        if (d.x < 0) d.x = w;
        if (d.x > w) d.x = 0;
        if (d.y < 0) d.y = h;
        if (d.y > h) d.y = 0;
        ctx!.beginPath();
        ctx!.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(52, 211, 153, ${d.a})`;
        ctx!.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();

    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  function enter() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("Your browser doesn't support location access.");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => onReady(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        setStatus("error");
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is required to place you on the map."
            : "Couldn't get your location. Please try again.",
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden bg-[#02040a] p-6 text-zinc-100">
      <canvas ref={canvasRef} className="absolute inset-0 opacity-60" />

      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="text-center animate-fade-in">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/10 ring-1 ring-emerald-400/20">
            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.715-6.747M12 21a9.004 9.004 0 0 1-8.715-6.747M12 21c-1.5 0-2.931-.298-4.236-.834M12 21c1.5 0 2.931-.298 4.236-.834M3.5 10.5a9.2 9.2 0 0 1 1.292-3.75M20.5 10.5a9.2 9.2 0 0 0-1.292-3.75M12 3v3m0 0-2-2m2 2 2-2" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-white">Pulse</h1>
          <p className="mt-3 max-w-md text-zinc-400 text-base leading-relaxed">
            A living globe of anonymous strangers. Drop onto the map and connect — no sign-up, no history, no traces.
          </p>
        </div>

        <button
          onClick={enter}
          disabled={status === "locating"}
          className="group relative rounded-full bg-emerald-400 px-10 py-3.5 font-semibold text-[#02040a] transition-all hover:bg-emerald-300 hover:shadow-lg hover:shadow-emerald-400/25 active:scale-95 disabled:opacity-60 disabled:hover:shadow-none animate-fade-in-up"
        >
          <span className="relative z-10">
            {status === "locating" ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 rounded-full border-2 border-[#02040a] border-t-transparent animate-spin" />
                Locating…
              </span>
            ) : (
              "Enter Pulse"
            )}
          </span>
        </button>

        {status === "error" && (
          <p className="max-w-sm text-center text-sm text-red-400 animate-fade-in">{error}</p>
        )}

        <p className="max-w-sm text-center text-xs text-zinc-600 animate-fade-in">
          No sign-up. Your dot is placed 1–3&nbsp;km from your real location.
          Nothing is stored — closing the tab ends everything.
        </p>
      </div>
    </div>
  );
}
