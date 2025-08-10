"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, ExternalLink, List } from "lucide-react";
import { Button } from "@/components/ui/button";

const ChapterNavigationModal = ({
    isOpen,
    onClose,
    videoId,
    title,
    chapters = [],
    query = ""
}) => {
    const [activeChapter, setActiveChapter] = useState(0);
    const playerRef = useRef(null);
    const playerElRef = useRef(null);

    // Parse chapters with time information - exact same logic as working version
    const parsedChapters = useMemo(() => {
        const re = /^\*\*(\d{2}:\d{2}:\d{2})\*\*\s*-\s*(.*)$/;
        return chapters.map(raw => {
            const m = raw.match(re);
            const time = m ? m[1] : '00:00:00';
            const title = m ? m[2] : raw.replace(/\*\*/g, '');
            const [hh, mm, ss] = time.split(':').map(Number);
            const seconds = hh * 3600 + mm * 60 + ss;
            return { time, title, seconds };
        });
    }, [chapters]);

    // Initialize YouTube Player - exact same logic as working version
    useEffect(() => {
        if (!isOpen || !videoId) return;

        const init = () => {
            if (playerRef.current || !playerElRef.current) return;
            playerRef.current = new window.YT.Player(playerElRef.current, {
                videoId,
                playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
            });
        };

        if (typeof window !== 'undefined') {
            if (window.YT && window.YT.Player) init();
            else {
                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                document.body.appendChild(tag);
                window.onYouTubeIframeAPIReady = init;
            }
        }

        return () => {
            if (playerRef.current && playerRef.current.destroy) {
                try {
                    playerRef.current.destroy();
                    playerRef.current = null;
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
        };
    }, [videoId, isOpen]);

    // Jump to time function - exact same logic as working version
    const jumpTo = (seconds, index) => {
        const p = playerRef.current;
        if (p && p.seekTo) {
            try { 
                p.seekTo(seconds, true); 
                p.playVideo && p.playVideo(); 
                setActiveChapter(index);
            } catch (e) {
                // Ignore player errors
            }
        }
    };

    const highlightText = (text, query) => {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
    };

    if (!isOpen) return null;

    // Use portal for better modal rendering
    if (typeof window === 'undefined') return null;

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="flex items-center justify-center min-h-screen p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
                    style={{
                        maxWidth: '1400px',
                        maxHeight: '90vh',
                        minHeight: '600px',
                        width: '95vw'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 bg-white border-b border-gray-200 shrink-0">
                        <h2 className="text-xl font-bold text-gray-900 truncate pr-4 flex-1">
                            {title}
                        </h2>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-lg"
                            >
                                <a
                                    href={`https://www.youtube.com/watch?v=${videoId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="YouTube'da Aç"
                                >
                                    <ExternalLink className="h-5 w-5" />
                                </a>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-lg"
                                title="Kapat"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                        {/* Video Player - Using same structure as working version */}
                        <div className="lg:w-2/3 bg-black flex items-center justify-center">
                            <div className="w-full aspect-video bg-slate-200 rounded-lg overflow-hidden">
                                <div ref={playerElRef} className="w-full h-full" />
                            </div>
                        </div>

                        {/* Chapters List */}
                        <div className="lg:w-1/3 flex flex-col bg-gray-50 lg:border-l border-gray-200 overflow-hidden">
                            <div className="p-6 bg-emerald-600 text-white shrink-0">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <List className="h-5 w-5" />
                                    Konu Başlıkları
                                </h3>
                                <p className="text-emerald-100 text-sm mt-1">{parsedChapters.length} bölüm</p>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto">
                                <div className="p-4 space-y-3">
                                    {parsedChapters.map((chapter, index) => (
                                        <motion.button
                                            key={index}
                                            onClick={() => jumpTo(chapter.seconds, index)}
                                            className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                                                activeChapter === index
                                                    ? 'bg-emerald-100 border-2 border-emerald-400 shadow-sm'
                                                    : 'bg-white hover:bg-gray-100 border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                            } touch-manipulation min-h-[64px]`}
                                            whileTap={{ scale: 0.98 }}
                                            whileHover={{ y: -1 }}
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className={`font-mono text-sm font-bold px-3 py-1.5 rounded-lg ${
                                                    activeChapter === index
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {chapter.time}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm leading-relaxed ${
                                                        activeChapter === index
                                                            ? 'text-emerald-900 font-medium'
                                                            : 'text-gray-700'
                                                    }`}
                                                    dangerouslySetInnerHTML={{
                                                        __html: highlightText(chapter.title, query)
                                                    }}
                                                    />
                                                </div>
                                                <Play className={`h-5 w-5 ${
                                                    activeChapter === index ? 'text-emerald-600' : 'text-gray-400'
                                                }`} />
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ChapterNavigationModal;