// ai/frontend/src/app/youtube-arama/page.js

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Youtube, FileQuestion, ServerCrash, Database } from "lucide-react";

// ShadCN UI Bileşenleri
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// --- ★★★ YENİ VE İYİLEŞTİRİLMİŞ BİLEŞENLER ★★★ ---

// 1. Video Sonuç Kartı
function VideoCard({ video, index }) {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { delay: index * 0.05 } }
  };
  
  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" exit="hidden">
      <Card className="overflow-hidden bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-xl border group h-full flex flex-col touch-manipulation">
        <div className="aspect-video bg-slate-200">
            <iframe 
              src={`https://www.youtube.com/embed/${video.id}`} 
              title={video.title} 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen 
              className="w-full h-full"
            ></iframe>
        </div>
        <CardHeader className="flex-grow p-3 sm:p-4">
            <CardTitle className="text-sm sm:text-base font-bold text-slate-800 line-clamp-2 leading-tight">{video.title}</CardTitle>
        </CardHeader>
        <CardFooter className="bg-slate-50/70 p-2 sm:p-3 flex justify-between items-center text-xs text-slate-500">
            <span className="font-semibold truncate max-w-[60%]">{video.channel}</span>
            <span className="text-xs">{new Date(video.publishedTime).toLocaleDateString('tr-TR')}</span>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

// 2. Video Kartı İskelet Yükleyici
function VideoSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {[...Array(6)].map((_, i) => (
                 <div key={i} className="bg-white rounded-xl border p-3 sm:p-4 space-y-3 sm:space-y-4 animate-pulse">
                    <div className="bg-slate-200 rounded-md aspect-video"></div>
                    <div className="space-y-2">
                        <div className="h-3 sm:h-4 bg-slate-200 rounded w-full"></div>
                        <div className="h-3 sm:h-4 bg-slate-200 rounded w-3/4"></div>
                    </div>
                     <div className="h-3 sm:h-4 bg-slate-200 rounded w-1/2 mt-2"></div>
                </div>
            ))}
        </div>
    )
}

// 3. Boş Durum / Hata Bileşeni
function InfoState({ title, message, icon: Icon }) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 px-6 bg-slate-100/80 rounded-2xl mt-8"
        >
            <Icon className="mx-auto h-16 w-16 text-slate-400 mb-4" />
            <h3 className="text-2xl font-bold text-slate-700">{title}</h3>
            <p className="text-slate-500 mt-2">{message}</p>
        </motion.div>
    )
}

// --- ★★★ ANA YOUTUBE ARAMA SAYFASI ★★★ ---
export default function YouTubeSearchPage() {
    const [query, setQuery] = useState("");
    const [selectedChannel, setSelectedChannel] = useState("Tüm Kanallar");
    const [videoResults, setVideoResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState(null);
    const [cacheStats, setCacheStats] = useState(null);
    
    const channels = [
        "Tüm Kanallar",
        "Yediulya", 
        "Kalemdar Alemdar",
        "Didar Akademi",
        "Kutbu Cihan"
    ];

    // Cache istatistiklerini yükle
    useEffect(() => {
        const fetchCacheStats = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/youtube/cache/stats`);
                if (response.ok) {
                    const data = await response.json();
                    setCacheStats(data.stats);
                }
            } catch (err) {
                console.error('Cache stats yüklenemedi:', err);
            }
        };
        fetchCacheStats();
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        
        setIsLoading(true);
        setSearched(true);
        setError(null);
        setVideoResults([]);

        const videoSearchUrl = new URL(`${API_BASE_URL}/search/videos`);
        videoSearchUrl.searchParams.append('q', query);
        if (selectedChannel !== "Tüm Kanallar") {
            videoSearchUrl.searchParams.append('channel', selectedChannel);
        }

        try {
            const response = await fetch(videoSearchUrl);
            if (!response.ok) {
                throw new Error("Arama sunucusuna ulaşılamadı. Lütfen daha sonra tekrar deneyin.");
            }
            const data = await response.json();
            setVideoResults(data.sonuclar || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 md:py-12 lg:py-20">
                <motion.header 
                    initial={{ opacity: 0, y: -20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.5 }} 
                    className="text-center mb-6 sm:mb-8 md:mb-10 px-2 sm:px-0"
                >
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#177267] leading-tight">YouTube Video Arama</h1>
                    <p className="mt-2 sm:mt-3 text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">Belirtilen kanallardaki videolarda arama yapın</p>
                    
                    {cacheStats && (
                        <div className="mt-4 sm:mt-6 flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm px-2">
                            <div className="flex items-center gap-1.5 sm:gap-2 bg-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-sm">
                                <Database className="h-3 w-3 sm:h-4 sm:w-4 text-[#177267]" />
                                <span className="font-semibold">{cacheStats.total_videos}</span>
                                <span className="text-slate-600 hidden sm:inline">video hazır</span>
                                <span className="text-slate-600 sm:hidden">video</span>
                            </div>
                            {cacheStats.channels?.slice(0, 3).map((channel, index) => (
                                <div key={index} className="bg-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-full shadow-sm">
                                    <span className="font-medium text-slate-700 text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">{channel.channel_name}</span>
                                    <span className="text-slate-500 ml-1">({channel.video_count})</span>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.header>

                <motion.section 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.5, delay: 0.1 }} 
                    className="max-w-3xl mx-auto px-2 sm:px-0"
                >
                    <form onSubmit={handleSearch} className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-grow">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#177267]" />
                                <Input
                                    type="text"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Video konusu girin (ör: rabıta)..."
                                    className="w-full h-10 sm:h-11 text-sm sm:text-base pl-9 border-slate-300 focus:border-[#177267] focus:ring-0 touch-manipulation"
                                    style={{
                                        WebkitTapHighlightColor: 'transparent',
                                        WebkitTouchCallout: 'none',
                                        WebkitUserSelect: 'text',
                                        fontSize: '16px' // Prevents zoom on iOS
                                    }}
                                />
                            </div>
                            <select 
                                value={selectedChannel}
                                onChange={e => setSelectedChannel(e.target.value)}
                                className="h-10 sm:h-11 px-3 border border-slate-300 rounded-md focus:border-[#177267] focus:ring-0 bg-white text-sm sm:text-base touch-manipulation"
                                style={{
                                    WebkitTapHighlightColor: 'transparent',
                                    WebkitTouchCallout: 'none'
                                }}
                            >
                                {channels.map(channel => (
                                    <option key={channel} value={channel}>{channel}</option>
                                ))}
                            </select>
                        </div>
                        <Button 
                            type="submit" 
                            disabled={isLoading} 
                            className="w-full h-10 sm:h-11 text-sm sm:text-base px-6 bg-[#177267] hover:bg-[#116358] text-white touch-manipulation min-h-[44px] active:scale-95"
                            style={{
                                WebkitTapHighlightColor: 'transparent',
                                WebkitTouchCallout: 'none',
                                WebkitUserSelect: 'none',
                                userSelect: 'none',
                                touchAction: 'manipulation'
                            }}
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : 'Ara'}
                        </Button>
                    </form>
                </motion.section>
                
                <section className="mt-8 sm:mt-10 md:mt-12 w-full px-2 sm:px-0">
                    <AnimatePresence mode="wait">
                        {isLoading && (
                            <motion.div key="loading" exit={{ opacity: 0 }}>
                                <VideoSkeleton />
                            </motion.div>
                        )}
                        {!isLoading && error && (
                            <motion.div key="error">
                                <InfoState title="Bir Hata Oluştu" message={error} icon={ServerCrash} />
                            </motion.div>
                        )}
                        {!isLoading && !error && searched && videoResults.length === 0 && (
                            <motion.div key="no-results">
                                <InfoState title="Sonuç Bulunamadı" message={`"${query}" için herhangi bir video bulunamadı.`} icon={FileQuestion} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {!isLoading && !error && videoResults.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                            {videoResults.map((video, index) => (
                                <VideoCard key={video.id || index} video={video} index={index} />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}