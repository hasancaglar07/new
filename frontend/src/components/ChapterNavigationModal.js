"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, ExternalLink, List } from "lucide-react";
import { Button } from "@/components/ui/button";

// Highlight search terms in text
function highlightSearchTerm(text, searchTerm) {
    if (!text || !searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 text-yellow-800 px-1 rounded font-bold">$1</mark>');
}

const ChapterNavigationModal = ({
    isOpen,
    onClose,
    videoId,
    title,
    chapters = [],
    searchQuery = ""
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

    if (!isOpen) return null;

    // Use portal for better modal rendering
    if (typeof window === 'undefined') return null;

    const modalContent = (
        <div
            className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-md"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 99999
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            {/* Mobile-First Responsive Container */}
            <div className="flex items-center justify-center min-h-screen p-4 sm:p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 50 }}
                    transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="w-full max-w-7xl max-h-[95vh] bg-white rounded-3xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 sm:p-6">
                        <div className="flex items-center justify-between text-white">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <List className="h-5 w-5 sm:h-6 sm:w-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-bold line-clamp-1">{title}</h2>
                                    <p className="text-emerald-100 text-sm">{parsedChapters.length} konu başlığı</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a 
                                    href={`https://www.youtube.com/watch?v=${videoId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
                                >
                                    <ExternalLink className="h-5 w-5" />
                                </a>
                                <button
                                    onClick={onClose}
                                    className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col lg:flex-row h-full max-h-[calc(95vh-120px)]">
                        {/* Video Player */}
                        <div className="lg:w-2/3 bg-black flex items-center justify-center min-h-[250px] sm:min-h-[350px] lg:min-h-[400px]">
                            <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                                <div ref={playerElRef} className="w-full h-full" />
                            </div>
                        </div>

                        {/* Chapters List */}
                        <div className="lg:w-1/3 flex flex-col bg-slate-50 lg:border-l border-slate-200 max-h-[400px] lg:max-h-full">
                            <div className="p-4 bg-white border-b border-slate-200 shrink-0">
                                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                    Konu Başlıkları
                                </h3>
                                <p className="text-slate-600 text-sm mt-1">Dinlemek istediğiniz konuya tıklayın</p>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                                <div className="p-4 space-y-3">
                                    {parsedChapters.map((chapter, index) => (
                                        <motion.button
                                            key={index}
                                            onClick={() => jumpTo(chapter.seconds, index)}
                                            className={`w-full text-left p-4 rounded-2xl transition-all duration-300 group ${
                                                activeChapter === index
                                                    ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 shadow-lg ring-2 ring-emerald-200'
                                                    : 'bg-white hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 border border-slate-200 hover:border-emerald-300 hover:shadow-md'
                                            } touch-manipulation min-h-[80px] sm:min-h-[70px]`}
                                            whileTap={{ scale: 0.98 }}
                                            whileHover={{ y: -2 }}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="shrink-0">
                                                    <span className={`font-mono text-sm font-bold px-3 py-2 rounded-xl shadow-sm transition-all ${
                                                        activeChapter === index
                                                            ? 'bg-emerald-600 text-white'
                                                            : 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200'
                                                    }`}>
                                                        {chapter.time}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm leading-relaxed font-medium ${
                                                        activeChapter === index
                                                            ? 'text-emerald-900'
                                                            : 'text-slate-700 group-hover:text-slate-900'
                                                    }`}
                                                    dangerouslySetInnerHTML={{
                                                        __html: highlightSearchTerm(chapter.title, searchQuery)
                                                    }}
                                                    />
                                                </div>
                                                <div className="shrink-0">
                                                    <Play className={`h-5 w-5 transition-colors ${
                                                        activeChapter === index ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-500'
                                                    }`} />
                                                </div>
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

    return createPortal(modalContent, document.body);
};

export default ChapterNavigationModal;