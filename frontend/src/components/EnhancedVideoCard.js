"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Play,
    ExternalLink,
    Clock,
    List,
    Eye,
    ChevronRight
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ChapterNavigationModal from "./ChapterNavigationModal";

// Highlight search terms in text
function highlightSearchTerm(text, searchTerm) {
    if (!text || !searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 text-yellow-800 px-1 rounded font-bold">$1</mark>');
}

const EnhancedVideoCard = ({ 
    videoId, 
    data, 
    onAnalyzeAgain, 
    index = 0,
    showEmbeddedPlayer = true,
    searchQuery = '' 
}) => {
    const [showChapterModal, setShowChapterModal] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    // Animation variants
    const cardVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: { 
            opacity: 1, 
            y: 0, 
            scale: 1,
            transition: { 
                delay: index * 0.05, 
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94] 
            } 
        }
    };

    const hoverVariants = {
        rest: { scale: 1, y: 0 },
        hover: { 
            scale: 1.03, 
            y: -5,
            transition: { duration: 0.2, ease: "easeOut" }
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

    // Handle invalid data
    if (!data || typeof data !== 'object' || !data.chapters || !Array.isArray(data.chapters)) {
        return (
            <motion.div variants={cardVariants} className="h-full">
                <Card className="overflow-hidden bg-white/90 backdrop-blur-sm border border-amber-200 flex flex-col items-center justify-center text-center p-8 h-full shadow-lg">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                        <ExternalLink className="h-8 w-8 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">
                        Veri Hatası
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                        Bu analiz verisi okunamıyor.
                    </p>
                    <a 
                        href={`https://www.youtube.com/watch?v=${videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                    >
                        <ExternalLink className="h-4 w-4" />
                        YouTube&apos;da Aç
                    </a>
                </Card>
            </motion.div>
        );
    }

    return (
        <>
            <motion.div 
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                className="h-full cursor-pointer"
                onClick={() => setShowChapterModal(true)}
            >
                <motion.div variants={hoverVariants} className="h-full">
                    <Card className="overflow-hidden bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col h-full group">
                        {/* Video Thumbnail */}
                        <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden">
                            <Image
                                src={data.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                                alt={data.title}
                                fill
                                style={{ objectFit: 'cover' }}
                                className="transition-all duration-500 group-hover:scale-110"
                                sizes="(max-width: 768px) 100vw, 33vw"
                                quality={85}
                                onError={(e) => {
                                    e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                                }}
                            />
                            
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            
                            {/* Play Button */}
                            <motion.div 
                                className="absolute inset-0 flex items-center justify-center"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="bg-white/95 backdrop-blur-sm rounded-full p-4 shadow-2xl">
                                    <Play className="h-8 w-8 text-slate-800 ml-1" />
                                </div>
                            </motion.div>

                            {/* Badges */}
                            <div className="absolute top-4 left-4 flex gap-2">
                                <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                                    AI Analiz
                                </span>
                                {parsedChapters.length > 0 && (
                                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                                        <List className="h-3 w-3" />
                                        {parsedChapters.length}
                                    </span>
                                )}
                            </div>

                            {/* External Link */}
                            <div className="absolute top-4 right-4">
                                <a 
                                    href={`https://www.youtube.com/watch?v=${videoId}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors shadow-lg"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex-grow flex flex-col">
                            {/* Title */}
                            <h3 className="text-lg font-bold text-slate-800 line-clamp-2 mb-3 group-hover:text-emerald-700 transition-colors">
                                {data.title}
                            </h3>
                            
                            {/* Stats */}
                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                                <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    <span>{parsedChapters.length} konu</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Eye className="h-4 w-4" />
                                    <span>AI Analizi</span>
                                </div>
                            </div>

                            {/* Chapter Preview - Show All */}
                             {parsedChapters.length > 0 && (
                                 <div className="flex-grow">
                                     <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                         <List className="h-4 w-4 text-emerald-600" />
                                         Konu Başlıkları ({parsedChapters.length})
                                     </h4>
                                     <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                                         {parsedChapters.map((chapter, chapterIndex) => (
                                              <div key={chapterIndex} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50/80 hover:bg-emerald-50/80 transition-colors">
                                                  <span className="font-mono text-xs font-bold text-emerald-600 bg-white px-2 py-1 rounded-md shrink-0 shadow-sm">
                                                      {chapter.time}
                                                  </span>
                                                  <span 
                                                      className="text-sm text-slate-700 line-clamp-2"
                                                      dangerouslySetInnerHTML={{ __html: highlightSearchTerm(chapter.title, searchQuery) }}
                                                  />
                                              </div>
                                          ))}
                                     </div>
                                 </div>
                             )}

                            {/* Action Button */}
                            <div className="mt-6">
                                <Button 
                                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowChapterModal(true);
                                    }}
                                >
                                    <Eye className="mr-2 h-5 w-5" />
                                    Detaylı İncele
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </motion.div>

            {/* Chapter Navigation Modal */}
            <ChapterNavigationModal
                isOpen={showChapterModal}
                onClose={() => setShowChapterModal(false)}
                videoId={videoId}
                title={data.title}
                chapters={data.chapters || []}
                searchQuery={searchQuery}
            />
        </>
    );
};

export default EnhancedVideoCard;