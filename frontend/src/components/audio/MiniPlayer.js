"use client";

import React from "react";
import { Play, Pause, Music } from "lucide-react";
import { useAudio } from "./AudioProvider";

export default function MiniPlayer() {
  const { current, isPlaying, progress, duration, toggle, seek, stop, chapters } = useAudio();
  if (!current) return null;

  const pct = duration ? Math.min(100, (progress / duration) * 100) : 0;
  const fmt = (s) => {
    if (!Number.isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <div className="fixed inset-x-0 bottom-16 md:bottom-20 z-50 px-3">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="px-4 pt-3">
          <div className="flex items-center gap-3">
            <button aria-label={isPlaying ? "Durdur" : "Oynat"} onClick={toggle} className="h-10 w-10 rounded-full bg-[#177267] text-white grid place-items-center">
              {isPlaying ? <Pause className="h-5 w-5"/> : <Play className="h-5 w-5"/>}
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900 truncate">{current.title}</div>
              <div className="text-xs text-slate-500 truncate">{current.source}</div>
            </div>
            <button aria-label="Kapat" onClick={stop} className="text-slate-400 hover:text-slate-600 text-sm">Kapat</button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[11px] tabular-nums text-slate-500">{fmt(progress)}</span>
            <div className="relative h-2 flex-1 rounded bg-slate-200 overflow-hidden cursor-pointer" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const ratio = x / rect.width;
              seek(ratio * (duration || 0));
            }}>
              <div className="absolute inset-y-0 left-0 bg-[#177267]" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] tabular-nums text-slate-500">{fmt(duration)}</span>
          </div>
          {chapters?.length > 0 && (
            <div className="mt-3 mb-3 flex gap-2 overflow-x-auto hide-scrollbar">
              {chapters.slice(0,6).map((c, i) => (
                <button key={i} onClick={() => {
                  const parts = (c.time||'0:00:00').split(':').map(Number);
                  const seconds = (parts[0]||0)*3600 + (parts[1]||0)*60 + (parts[2]||0);
                  seek(seconds);
                }} className="shrink-0 px-3 py-1.5 rounded-full border border-slate-200 text-xs text-slate-700 hover:bg-slate-50">
                  <span className="inline-flex items-center gap-1">
                    <Music className="h-3.5 w-3.5 text-[#177267]"/>
                    <span className="font-medium">{c.title || 'Konu'}</span>
                    <span className="text-slate-500">{c.time}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


