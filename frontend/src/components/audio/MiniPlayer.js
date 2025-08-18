"use client";

import React from "react";
import { Play, Pause, Music, Share2, MessageCircle, X } from "lucide-react";
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
          {/* Konu Başlıkları - Aşağı Doğru */}
          {chapters?.length > 0 && (
            <div className="mt-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Music className="h-3.5 w-3.5 text-[#177267]"/>
                  Konu Başlıkları
                </h4>
                <span className="text-xs text-slate-500">{chapters.length} konu</span>
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {chapters.slice(0,4).map((c, i) => (
                   <div key={i} className="w-full border border-slate-200 rounded-lg hover:border-emerald-200 transition-colors">
                     <button onClick={() => {
                       const parts = (c.time||'0:00:00').split(':').map(Number);
                       const seconds = (parts[0]||0)*3600 + (parts[1]||0)*60 + (parts[2]||0);
                       seek(seconds);
                     }} className="w-full text-left px-2 py-1.5 text-xs text-slate-700 hover:bg-emerald-50 transition-colors rounded-t-lg">
                       <div className="flex items-center gap-2">
                         <span className="text-xs font-mono font-semibold text-[#177267] bg-white px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                           {c.time}
                         </span>
                         <span className="font-medium truncate">{c.title || 'Konu'}</span>
                       </div>
                     </button>
                     <div className="px-2 pb-1 border-t border-slate-100">
                        <div className="flex items-center justify-end">
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => {
                                const parts = (c.time||'0:00:00').split(':').map(Number);
                                const seconds = (parts[0]||0)*3600 + (parts[1]||0)*60 + (parts[2]||0);
                                const baseUrl = window.location.origin + '/ses-kayitlari';
                                const audioUrl = `${baseUrl}?audio=${encodeURIComponent(current.id)}&time=${seconds}&autoplay=true`;
                                const text = `🎧 "${c.title}" konusunu dinleyin! (${c.time}) - ${current.title} - ${current.source}`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + audioUrl)}`, '_blank');
                              }}
                              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                              title="WhatsApp'ta Paylaş"
                            >
                              <MessageCircle className="h-2.5 w-2.5" />
                            </button>
                            <button
                              onClick={() => {
                                const parts = (c.time||'0:00:00').split(':').map(Number);
                                const seconds = (parts[0]||0)*3600 + (parts[1]||0)*60 + (parts[2]||0);
                                const baseUrl = window.location.origin + '/ses-kayitlari';
                                const audioUrl = `${baseUrl}?audio=${encodeURIComponent(current.id)}&time=${seconds}&autoplay=true`;
                                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(audioUrl)}&quote=${encodeURIComponent(`🎧 "${c.title}" konusunu dinleyin! (${c.time}) - ${current.title} - ${current.source}`)}`, '_blank');
                              }}
                              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                              title="Facebook'ta Paylaş"
                            >
                              <Share2 className="h-2.5 w-2.5" />
                            </button>
                            <button
                              onClick={() => {
                                const parts = (c.time||'0:00:00').split(':').map(Number);
                                const seconds = (parts[0]||0)*3600 + (parts[1]||0)*60 + (parts[2]||0);
                                const baseUrl = window.location.origin + '/ses-kayitlari';
                                const audioUrl = `${baseUrl}?audio=${encodeURIComponent(current.id)}&time=${seconds}&autoplay=true`;
                                const text = `🎧 "${c.title}" konusunu dinleyin! (${c.time}) - ${current.title} - ${current.source}`;
                                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(audioUrl)}`, '_blank');
                              }}
                              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                              title="X'te Paylaş"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                   </div>
                 ))}
                {chapters.length > 4 && (
                  <div className="text-center">
                    <span className="text-xs text-slate-500">+{chapters.length - 4} konu daha</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Sosyal Medya Paylaşım Butonları */}
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-end">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const baseUrl = window.location.origin + '/ses-kayitlari';
                      const audioUrl = `${baseUrl}?audio=${encodeURIComponent(current.id)}&autoplay=true`;
                      const text = `🎧 "${current.title}" ses kaydını dinleyin! - ${current.source}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + audioUrl)}`, '_blank');
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                    title="WhatsApp'ta Paylaş"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      const baseUrl = window.location.origin + '/ses-kayitlari';
                      const audioUrl = `${baseUrl}?audio=${encodeURIComponent(current.id)}&autoplay=true`;
                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(audioUrl)}&quote=${encodeURIComponent(`🎧 "${current.title}" ses kaydını dinleyin! - ${current.source}`)}`, '_blank');
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                    title="Facebook'ta Paylaş"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      const baseUrl = window.location.origin + '/ses-kayitlari';
                      const audioUrl = `${baseUrl}?audio=${encodeURIComponent(current.id)}&autoplay=true`;
                      const text = `🎧 "${current.title}" ses kaydını dinleyin! - ${current.source}`;
                      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(audioUrl)}`, '_blank');
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                    title="X'te Paylaş"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}


