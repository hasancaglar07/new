"use client";

import React, { createContext, useContext, useMemo, useRef, useState, useEffect, useCallback } from "react";

const AudioContext = createContext(null);

export function AudioProvider({ children }) {
  const audioRef = useRef(null);
  const [current, setCurrent] = useState(null); // { id, title, source, mp3Filename }
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0); // seconds
  const [chapters, setChapters] = useState([]); // [{ time: 'hh:mm:ss', title }]

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

  // Initialize audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "metadata";
    }
    const el = audioRef.current;
    const onLoadedMeta = () => setDuration(el.duration || 0);
    const onTimeUpdate = () => setProgress(el.currentTime || 0);
    const onEnded = () => setIsPlaying(false);
    el.addEventListener("loadedmetadata", onLoadedMeta);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("loadedmetadata", onLoadedMeta);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("ended", onEnded);
    };
  }, []);

  const play = useCallback(async ({ id, title, source, mp3Filename, startSeconds, chapters: ch }) => {
    if (!mp3Filename) return;
    const el = audioRef.current;
    const src = `${API_BASE_URL}/audio/file/${mp3Filename}`;
    if (el.src !== src) {
      el.src = src;
    }
    setCurrent({ id, title, source, mp3Filename });
    setChapters(Array.isArray(ch) ? ch : []);
    try {
      if (Number.isFinite(startSeconds) && startSeconds > 0) {
        el.currentTime = startSeconds;
      }
      await el.play();
      setIsPlaying(true);
    } catch (e) {
      // Autoplay block or other error
      setIsPlaying(false);
      // no-op
    }
  }, [API_BASE_URL]);

  const pause = useCallback(() => {
    const el = audioRef.current;
    el.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (!current) return;
    if (isPlaying) {
      pause();
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(()=>{});
    }
  }, [current, isPlaying, pause]);

  const seek = useCallback((seconds) => {
    const el = audioRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(seconds, duration || el.duration || 0));
    el.currentTime = clamped;
    setProgress(clamped);
  }, [duration]);

  const stop = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    setIsPlaying(false);
    setProgress(0);
    setCurrent(null);
  }, []);

  // Media Session API
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (current) {
      ms.metadata = new window.MediaMetadata({
        title: current.title || "",
        artist: current.source || "",
        album: "Mihmandar Ses",
      });
      navigator.mediaSession.setActionHandler("play", () => toggle());
      navigator.mediaSession.setActionHandler("pause", () => toggle());
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.fastSeek && "fastSeek" in audioRef.current) {
          audioRef.current.fastSeek(details.seekTime);
        } else {
          seek(details.seekTime ?? 0);
        }
      });
    }
    return () => {
      // leave handlers as-is
    };
  }, [current, toggle, seek]);

  const value = useMemo(() => ({
    current,
    isPlaying,
    duration,
    progress,
    chapters,
    play,
    pause,
    toggle,
    seek,
    stop,
  }), [current, isPlaying, duration, progress, chapters, play, pause, toggle, seek, stop]);

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error("useAudio must be used within AudioProvider");
  return ctx;
}


