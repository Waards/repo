"use client";

import { useEffect, useRef } from "react";

export default function VideoPanel({
  localStream,
  remoteStream,
  onEnd,
}: {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEnd: () => void;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localRef.current && localRef.current.srcObject !== localStream) {
      localRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteRef.current.srcObject !== remoteStream) {
      remoteRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-black animate-fade-in">
      <div className="relative flex-1">
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className="h-full w-full bg-zinc-900 object-cover"
        />
        {!remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
              <p className="text-zinc-500 text-sm">Waiting for stranger&rsquo;s video&hellip;</p>
            </div>
          </div>
        )}

        <div className="absolute top-4 left-4 z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/80 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Live
          </span>
        </div>

        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-4 right-4 z-10 h-36 w-28 rounded-xl border border-zinc-700 bg-zinc-800 object-cover shadow-lg shadow-black/50"
        />
      </div>
      <div className="flex justify-center bg-zinc-950 p-4">
        <button
          onClick={onEnd}
          className="rounded-full bg-red-500 px-10 py-3 font-semibold text-white transition hover:bg-red-400 active:scale-95"
        >
          End video
        </button>
      </div>
    </div>
  );
}
