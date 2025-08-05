// ai/frontend/src/app/youtube-arama/page.js

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Youtube, FileQuestion, ServerCrash } from "lucide-react";

// ShadCN UI Bileşenleri
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const API_BASE_URL = "http://127.0.0.1:8000";

// --- ★★★ YENİ VE İYİLEŞTİRİLMİŞ BİLEŞENLER ★★★ ---

// 1. Video Sonuç Kartı
function VideoCard({ video, index }) {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { delay: index * 0.05 } }
  };
  
  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" exit="hidden">
      <Card className="overflow-hidden bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-xl border group h-full flex flex-col">
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
        <CardHeader className="flex-grow">
            <CardTitle className="text-base font-bold text-slate-800 line-clamp-2">{video.title}</CardTitle>
        </CardHeader>
        <CardFooter className="bg-slate-50/70 p-3 flex justify-between items-center text-xs text-slate-500">
            <span className="font-semibold">{video.channel}</span>
            <span>{new Date(video.publishedTime).toLocaleDateString('tr-TR')}</span>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

// 2. Video Kartı İskelet Yükleyici
function VideoSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[...Array(6)].map((_, i) => (
                 <div key={i} className="bg-white rounded-xl border p-4 space-y-4 animate-pulse">
                    <div className="bg-slate-200 rounded-md aspect-video"></div>
                    <div className="space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-full"></div>
                        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    </div>
                     <div className="h-4 bg-slate-200 rounded w-1/2 mt-2"></div>
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
    const [videoResults, setVideoResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        
        setIsLoading(true);
        setSearched(true);
        setError(null);
        setVideoResults([]);

        const videoSearchUrl = new URL(`${API_BASE_URL}/search/videos`);
        videoSearchUrl.searchParams.append('q', query);

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
            <div className="container mx-auto px-4 py-12 md:py-20">
                <motion.header 
                    initial={{ opacity: 0, y: -20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-slate-800">
                        YouTube Video Arama
                    </h1>
                    <p className="mt-4 text-lg md:text-xl text-slate-600">
                        Belirtilen kanallardaki videolarda arama yapın.
                    </p>
                </motion.header>

                <motion.section 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="max-w-2xl mx-auto"
                >
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-grow">
                             <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <Input
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Video konusu girin (ör: rabıta)..."
                                className="w-full h-14 text-base pl-12 rounded-lg"
                            />
                        </div>
                        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto h-14 text-base px-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all transform hover:scale-105">
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Ara'}
                        </Button>
                    </form>
                </motion.section>
                
                <section className="mt-12 w-full">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
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