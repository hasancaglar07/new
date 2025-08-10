"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Play,
    Pause,
    ExternalLink,
    Clock,
    List,
    Maximize2,
    AlertTriangle,
    Repeat,
    Volume2,
    VolumeX
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ChapterNavigationModal from "./ChapterNavigationModal";

const EnhancedVideoCard = ({ 
    videoId, 
    data, 
    onAnalyzeAgain, 
    index = 0,
    showEmbeddedPlayer = true 
}) => {
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [showChapterModal, setShowChapterModal] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const playerRef = useRef(null);
    const playerElRef = useRef(null);

    // Animation variants
    const cardVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: { 
            opacity: 1, 
            y: 0, 
            scale: 1,
            transition: { 
                delay: index * 0.1, 
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94] 
            } 
        }
    };

    // Parse chapters with time information
    const parsedChapters = data?.chapters?.map(raw => {
        const match = raw.match(/^\*\*(\d{2}:\d{2}:\d{2})\*\*\s*-\s*(.*)$/);
        if (match) {
            const time = match[1];
            const title = match[2];
            const [hh, mm, ss] = time.split(':').map(Number);
            const seconds = hh * 3600 + mm * 60 + ss;
            return { time, title, seconds };
        }
        return { time: '00:00:00', title: raw.replace(/\*\*/g, ''), seconds: 0 };
    }) || [];

    // Initialize YouTube player
    useEffect(() => {
        if (!showEmbeddedPlayer || !videoId) return;

        const initPlayer = () => {
            if (playerRef.current || !playerElRef.current) return;
            
            playerRef.current = new window.YT.Player(playerElRef.current, {
                videoId,
                height: '100%',
                width: '100%',
                playerVars: {
                    rel: 0,
                    modestbranding: 1,
                    playsinline: 1,
                    controls: 1,
                    mute: 1,
                    autoplay: 0
                },
                events: {
                    onReady: (event) => {
                        setIsPlayerReady(true);
                        setDuration(event.target.getDuration());
                    },
                    onStateChange: (event) => {
                        setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
                    }
                }
            });
        };

        if (typeof window !== 'undefined') {
            if (window.YT && window.YT.Player) {
                initPlayer();
            } else {
                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                document.body.appendChild(tag);
                window.onYouTubeIframeAPIReady = initPlayer;
            }
        }

        return () => {
            if (playerRef.current && playerRef.current.destroy) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
        };
    }, [videoId, showEmbeddedPlayer]);

    // Update current time periodically
    useEffect(() => {
        if (!isPlaying || !playerRef.current) return;

        const interval = setInterval(() => {
            if (playerRef.current && playerRef.current.getCurrentTime) {
                setCurrentTime(playerRef.current.getCurrentTime());
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isPlaying]);

    const jumpToTime = (seconds) => {
        if (playerRef.current && playerRef.current.seekTo) {
            playerRef.current.seekTo(seconds, true);
            if (playerRef.current.playVideo) {
                playerRef.current.playVideo();
            }
        }
    };

    const togglePlayPause = () => {
        if (!playerRef.current) return;
        
        if (isPlaying) {
            playerRef.current.pauseVideo();
        } else {
            playerRef.current.playVideo();
        }
    };

    const toggleMute = () => {
        if (!playerRef.current) return;
        
        if (isMuted) {
            playerRef.current.unMute();
            setIsMuted(false);
        } else {
            playerRef.current.mute();
            setIsMuted(true);
        }
    };

    // Handle invalid data
    if (!data || typeof data !== 'object' || !data.chapters || !Array.isArray(data.chapters)) {
        return (
            <motion.div variants={cardVariants} className="h-full">
                <Card className="overflow-hidden bg-white border border-amber-300 flex flex-col items-center justify-center text-center p-6 h-full">
                    <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
                    <CardTitle className="text-lg font-bold text-slate-800 mb-2">
                        Uyumsuz Veri
                    </CardTitle>
                    <CardDescription className="text-sm mb-4">
                        Bu kayıt eski formatta veya bozuk.
                    </CardDescription>
                    <Button 
                        variant="outline" 
                        onClick={() => onAnalyzeAgain(`https://www.youtube.com/watch?v=${videoId}`)} 
                        className="w-full text-sm text-slate-600 hover:text-emerald-700"
                    >
                        <Repeat className="mr-2 h-4 w-4" /> 
                        Tekrar Analiz Et
                    </Button>
                </Card>
            </motion.div>
        );
    }

    return (
        <>
            <motion.div variants={cardVariants} className="h-full">
                <Card className="overflow-hidden bg-white border border-gray-200 hover:border-emerald-200 group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col h-full">
                    {/* Video Player Section */}
                    <div className="aspect-video bg-gradient-to-br from-emerald-100/60 to-teal-100/40 relative overflow-hidden">
                        <div className="w-full h-full relative">
                            {/* Always show thumbnail with play button */}
                            <Image
                                src={data.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                                alt={data.title}
                                fill
                                style={{ objectFit: 'cover' }}
                                className="transition-transform group-hover:scale-105"
                                sizes="(max-width: 768px) 100vw, 50vw"
                                quality={75}
                                onError={(e) => {
                                    // Fallback to standard quality if maxres fails
                                    e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                                }}
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                                <Button
                                    size="lg"
                                    className="bg-white/90 hover:bg-white text-slate-800 shadow-lg"
                                    onClick={() => setShowChapterModal(true)}
                                >
                                    <Play className="h-6 w-6 mr-2" />
                                    Videoyu İzle
                                </Button>
                            </div>
                        </div>

                        {/* Video Info Badges */}
                        <div className="absolute top-3 left-3 flex gap-2">
                            <span className="bg-emerald-500/90 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-md">
                                AI Analiz
                            </span>
                            {parsedChapters.length > 0 && (
                                <span className="bg-blue-500/90 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-md flex items-center gap-1">
                                    <List className="h-3 w-3" />
                                    {parsedChapters.length} Bölüm
                                </span>
                            )}
                        </div>

                        {/* External Link */}
                        <div className="absolute top-3 right-3">
                            <a 
                                href={`https://www.youtube.com/watch?v=${videoId}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="bg-black/50 text-white p-2 rounded-full hover:bg-black/80 transition-colors shadow-md"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                    </div>

                    {/* Card Header */}
                    <CardHeader className="p-6 pb-4">
                        <CardTitle className="text-lg font-bold text-slate-800 line-clamp-2 group-hover:text-emerald-700 transition-colors">
                            {data.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Clock className="h-4 w-4" />
                            <span>{parsedChapters.length} konu başlığı</span>
                        </div>
                    </CardHeader>

                    {/* Chapters Accordion */}
                    <CardContent className="p-0 flex-grow">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="chapters" className="border-b-0">
                                <AccordionTrigger className="text-sm font-semibold text-emerald-700 hover:no-underline px-6 py-4 hover:bg-emerald-50/30 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <List className="h-4 w-4" />
                                        Konu Başlıklarını Gör ({parsedChapters.length})
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-4">
                                    <div className="max-h-48 overflow-y-auto border border-emerald-200/60 rounded-lg bg-gradient-to-r from-emerald-50/40 to-transparent">
                                        <ul className="space-y-2 p-3">
                                            {parsedChapters.map((chapter, chapterIndex) => (
                                                <li key={chapterIndex}>
                                                    <button
                                                        onClick={() => jumpToTime(chapter.seconds)}
                                                        className="w-full text-left p-2 rounded-md hover:bg-emerald-100/60 border border-transparent hover:border-emerald-200 transition-all group/chapter"
                                                        disabled={!isPlayerReady}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <span className="font-mono text-sm font-bold text-emerald-600 bg-white px-2 py-1 rounded-md shrink-0 shadow-sm group-hover/chapter:bg-emerald-100">
                                                                {chapter.time}
                                                            </span>
                                                            <span className="text-sm text-slate-700 leading-relaxed">
                                                                {chapter.title}
                                                            </span>
                                                        </div>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-emerald-100/60 mt-auto">
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                onClick={() => onAnalyzeAgain(`https://www.youtube.com/watch?v=${videoId}`)} 
                                className="flex-1 text-sm text-slate-600 hover:text-emerald-700 border-emerald-200 hover:border-emerald-300"
                            >
                                <Repeat className="mr-2 h-4 w-4" /> 
                                Yeniden Analiz Et
                            </Button>
                            <Button 
                                onClick={() => setShowChapterModal(true)}
                                className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
                            >
                                <Maximize2 className="mr-2 h-4 w-4" />
                                Detaylı Görünüm
                            </Button>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* Enhanced Chapter Navigation Modal */}
            <ChapterNavigationModal
                isOpen={showChapterModal}
                onClose={() => setShowChapterModal(false)}
                videoId={videoId}
                title={data.title}
                chapters={data.chapters || []}
            />
        </>
    );
};

export default EnhancedVideoCard;