// ai/frontend/src/app/video-analizi/page.js

"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, History, Loader2, ServerCrash, FileQuestion, Repeat, ExternalLink, AlertTriangle, CheckCircle2, Circle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import VideoSearchFilter from "@/components/VideoSearchFilter";
import EnhancedVideoCard from "@/components/EnhancedVideoCard";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const extractVideoId = (url) => {
    const match = url.match(/(?:v=|\/|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
};

// --- BEKLEME KARTI BİLEŞENİ ---
const TASAVVUF_TAVSIYELER = [
    "Kalbinizi rabıta ile arındırın.", "Zikr ile ruhunuzu yükseltin.", "Sabır, tasavvufun anahtarıdır.",
    "İlim, amelsiz faydasızdır.", "Mürşid, yol göstericidir.", "Tevekkül, huzurun kapısıdır.",
    "Şükür, nimetin artmasıdır.", "En büyük cihad, nefisle olan cihaddır.", "Hiçbir şey tesadüf değildir, her şey tevafuktur."
];

function EnhancedAnalysisStatusCard({ statusMessage }) {
    const [progress, setProgress] = useState(13);
    const [currentTip, setCurrentTip] = useState(0);

    const steps = [
        { id: 1, text: "Görev Başlatılıyor", keyword: "başlat" },
        { id: 2, text: "Video Bilgileri Alınıyor", keyword: "bilgi" },
        { id: 3, text: "Video Sesi İndiriliyor", keyword: "indir" },
        { id: 4, text: "Ses Metne Dönüştürülüyor", keyword: "dönüştür" },
        { id: 5, text: "Konu Başlıkları Oluşturuluyor", keyword: "oluştur" },
    ];

    const currentStepIndex = steps.findIndex(step => statusMessage.toLowerCase().includes(step.keyword));
    
    useEffect(() => {
        const timer = setTimeout(() => setProgress(prev => (prev >= 90 ? 90 : prev + 7)), 800);
        return () => clearTimeout(timer);
    });

    useEffect(() => {
        const tipTimer = setInterval(() => {
            setCurrentTip(prev => (prev + 1) % TASAVVUF_TAVSIYELER.length);
        }, 6000);
        return () => clearInterval(tipTimer);
    }, []);

    const getStepStatus = (stepIndex) => {
        if (currentStepIndex === -1 && stepIndex === 0) return "in-progress";
        if (stepIndex < currentStepIndex) return "completed";
        if (stepIndex === currentStepIndex) return "in-progress";
        return "pending";
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="text-center p-6 md:p-10 shadow-lg border-t-4 border-emerald-500">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-slate-800">Analiz Sürüyor</CardTitle>
                    <CardDescription className="text-lg mt-2 text-slate-600">Bu manevi yolculuk biraz zaman alabilir, sabrınız için teşekkürler.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 mt-6">
                    <div className="space-y-4 text-left">
                        {steps.map((step, index) => {
                            const status = getStepStatus(index);
                            return (
                                <motion.div key={step.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="flex items-center gap-4">
                                    <div className="flex items-center justify-center">
                                        {status === 'completed' && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
                                        {status === 'in-progress' && <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />}
                                        {status === 'pending' && <Circle className="h-6 w-6 text-slate-300" />}
                                    </div>
                                    <span className={`font-medium ${status === 'pending' ? 'text-slate-400' : 'text-slate-700'}`}>{step.text}</span>
                                </motion.div>
                            );
                        })}
                    </div>
                    <Progress value={progress} className="w-full h-3" />
                    <div className="pt-4 text-center">
                        <AnimatePresence mode="wait">
                            <motion.div key={currentTip} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5 }} className="flex items-center justify-center gap-3 text-slate-500 italic">
                                <Lightbulb className="h-5 w-5 text-amber-400" /><p>&quot;{TASAVVUF_TAVSIYELER[currentTip]}&quot;</p>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

function AnalysisResultCard({ result, url }) {
    const videoId = extractVideoId(url);
    const chaptersRef = useRef(null);
    const playerRef = useRef(null);
    const playerElRef = useRef(null);

    useEffect(() => {
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
    }, [videoId]);

    const handleScrollChapters = () => {
        try { chaptersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
    };

    const parsedChapters = useMemo(() => {
        const re = /^\*\*(\d{2}:\d{2}:\d{2})\*\*\s*-\s*(.*)$/;
        return (result?.chapters || []).map(raw => {
            const m = raw.match(re);
            const time = m ? m[1] : '00:00:00';
            const title = m ? m[2] : raw.replace(/\*\*/g, '');
            const [hh, mm, ss] = time.split(':').map(Number);
            const seconds = hh * 3600 + mm * 60 + ss;
            return { time, title, seconds };
        });
    }, [result]);

    const jumpTo = (seconds) => {
        const p = playerRef.current;
        if (p && p.seekTo) {
            try { p.seekTo(seconds, true); p.playVideo && p.playVideo(); } catch {}
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Card className="overflow-hidden border-t-4 border-emerald-500 rounded-2xl shadow-lg">
                <CardHeader className="gap-2">
                    <CardTitle className="text-xl md:text-2xl text-slate-800">Analiz Tamamlandı</CardTitle>
                    <CardDescription className="text-slate-600">{result.title}</CardDescription>
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">Videoya Git</a>
                        <Button onClick={handleScrollChapters} className="bg-white text-emerald-700 border border-emerald-600 hover:bg-emerald-50">Bölümleri Göster</Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="aspect-video bg-slate-200 rounded-lg overflow-hidden"><div ref={playerElRef} className="w-full h-full" /></div>
                    <div ref={chaptersRef}>
                        <h3 className="font-semibold mb-3 text-slate-800">Konu Başlıkları</h3>
                        <ul className="space-y-2 text-sm max-h-60 overflow-y-auto border rounded-lg p-3 bg-slate-50/80">
                            {parsedChapters.map((c, index) => (
                                <li key={index}>
                                    <button onClick={() => jumpTo(c.seconds)} className="w-full text-left p-2 rounded-md hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all">
                                        <span className="font-semibold text-emerald-700 mr-2">{c.time}</span>
                                        <span className="text-slate-700" dangerouslySetInnerHTML={{ __html: c.title }} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

function HistoryCard({ videoId, data, onAnalyzeAgain }) {
    if (typeof data !== 'object' || data === null || !data.chapters || !Array.isArray(data.chapters)) {
        return (
            <Card className="overflow-hidden bg-white border border-amber-300 flex flex-col items-center justify-center text-center p-4 h-full">
                <AlertTriangle className="h-10 w-10 text-amber-500 mb-2" />
                <CardTitle className="text-base font-bold text-slate-800">Uyumsuz Veri</CardTitle>
                <CardDescription className="text-xs mt-1">Bu kayıt eski formatta.</CardDescription>
                <Button variant="ghost" onClick={() => onAnalyzeAgain(`https://www.youtube.com/watch?v=${videoId}`)} className="w-full text-xs text-slate-600 hover:text-emerald-700 mt-4">
                    <Repeat className="mr-2 h-3 w-3" /> Tekrar Analiz Et
                </Button>
            </Card>
        );
    }
    return (
        <Card className="overflow-hidden bg-white border group">
            <div className="aspect-video bg-slate-200 overflow-hidden relative">
                <Image src={data.thumbnail} alt={data.title} fill style={{ objectFit: 'cover' }} className="transition-transform group-hover:scale-105" sizes="(max-width: 768px) 100vw, 50vw" quality={75} />
                <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/80 transition-colors z-10">
                    <ExternalLink className="h-4 w-4" />
                </a>
            </div>
            <CardHeader><CardTitle className="text-base font-bold text-slate-800 line-clamp-2">{data.title}</CardTitle></CardHeader>
            <CardContent className="p-0">
                 <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1" className="border-b-0">
                        <AccordionTrigger className="text-sm font-semibold text-emerald-700 hover:no-underline px-6 py-2">Bölümleri Göster</AccordionTrigger>
                        <AccordionContent className="px-6">
                             <ul className="space-y-2 text-sm max-h-48 overflow-y-auto border rounded-lg p-3 bg-slate-50">
                                {data.chapters.map((chapter, index) => (
                                    <li key={index} className="p-1 rounded-md text-slate-700" dangerouslySetInnerHTML={{ __html: chapter.replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-700 font-bold">$1</strong>') }} />
                                ))}
                            </ul>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
            <div className="p-4 border-t mt-2">
                 <Button variant="ghost" onClick={() => onAnalyzeAgain(`https://www.youtube.com/watch?v=${videoId}`)} className="w-full text-xs text-slate-600 hover:text-emerald-700">
                    <Repeat className="mr-2 h-3 w-3" /> Bu analizi yeniden yap
                </Button>
            </div>
        </Card>
    );
}

function HistorySkeleton() {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">{[...Array(3)].map((_, i) => (<div key={i} className="bg-white rounded-xl border p-4 space-y-4 animate-pulse"><div className="bg-slate-200 rounded-md aspect-video"></div><div className="h-4 bg-slate-200 rounded w-full"></div><div className="h-4 bg-slate-200 rounded w-3/4"></div><div className="h-8 bg-slate-200 rounded w-full mt-4"></div></div>))}</div>
}

function InfoState({ title, message, icon: Icon }) {
    return (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16 px-6 bg-slate-100/80 rounded-2xl mt-8"><Icon className="mx-auto h-16 w-16 text-slate-400 mb-4" /><h3 className="text-2xl font-bold text-slate-700">{title}</h3><p className="text-slate-500 mt-2">{message}</p></motion.div>)
}

// --- ANA SAYFA BİLEŞENİ ---
export default function VideoAnalysisPage() {
    const [url, setUrl] = useState("");
    const [currentAnalysisUrl, setCurrentAnalysisUrl] = useState("");
    const [analysisResult, setAnalysisResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]); // ★★★ DÜZELTME: Boş dizi ile başlatıldı
    const [filteredHistory, setFilteredHistory] = useState([]); // Filtered history for search
    const [historyLoading, setHistoryLoading] = useState(true);
    const [taskId, setTaskId] = useState(null);
    const [statusMessage, setStatusMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState('');
    const pollingIntervalRef = useRef(null);

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/analysis_history`);
            const data = await response.json();
            // ★★★ DÜZELTME: API'den gelen obje, düzgün bir diziye çevriliyor
            const formattedHistory = Object.entries(data).map(([videoId, videoData]) => ({
                id: videoId,
                data: videoData,
            })).reverse(); // En yeni en üste
            setHistory(formattedHistory);
        } catch (err) {
            console.error("Geçmiş alınamadı:", err);
            setError("Analiz geçmişi yüklenirken bir hata oluştu.");
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);
    
    // ★★★ İYİLEŞTİRME: useCallback ile fonksiyonun gereksiz yere yeniden oluşması engellendi
    const stopPolling = useCallback(() => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        const pollStatus = async () => {
            if (!taskId) return;
            try {
                const response = await fetch(`${API_BASE_URL}/analyze/status/${taskId}`);
                if (!response.ok) throw new Error("Durum sunucusuna ulaşılamadı.");
                const data = await response.json();

                if (data.status === "processing") {
                    setStatusMessage(data.message);
                } else if (data.status === "completed") {
                    stopPolling();
                    setAnalysisResult(data.result);
                    // ★★★ İYİLEŞTİRME: Geçmiş listesi daha güvenli güncelleniyor
                    const newEntry = { id: taskId, data: data.result };
                    setHistory(prev => [newEntry, ...prev.filter(item => item.id !== taskId)]);
                    setIsLoading(false);
                    setTaskId(null);
                    setUrl("");
                } else if (data.status === "error") {
                    stopPolling();
                    setError(data.message);
                    setIsLoading(false);
                    setTaskId(null);
                }
            } catch (err) {
                stopPolling();
                setError("Analiz durumu sorgulanırken bir hata oluştu.");
                setIsLoading(false);
                setTaskId(null);
            }
        };

        if (taskId) {
            pollingIntervalRef.current = setInterval(pollStatus, 5000);
        }
        return stopPolling; // Component unmount olduğunda polling'i durdur
    }, [taskId, stopPolling]);

    const handleAnalyze = async (e) => {
        if (e) e.preventDefault();
        if (isLoading) return;
        const videoId = extractVideoId(url);
        if (!videoId) { setError("Lütfen geçerli bir YouTube linki girin."); return; }
        
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);
        setCurrentAnalysisUrl(url);
        setStatusMessage("Görev Başlatılıyor...");

        try {
            const params = new URLSearchParams({ url });
            const response = await fetch(`${API_BASE_URL}/analyze/start?${params.toString()}`, { method: 'POST' });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ detail: "Analiz başlatılamadı." }));
                throw new Error(errData.detail);
            }
            const data = await response.json();
            setTaskId(data.task_id);
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    };
    
    // ★★★ İYİLEŞTİRME: Yeniden analiz için daha sağlam bir yapı
    const [urlToAnalyze, setUrlToAnalyze] = useState('');
    
    useEffect(() => {
        if (urlToAnalyze) {
            setUrl(urlToAnalyze);
            // Formu submit etmek için butona tıklamış gibi davranıyoruz.
            // Bu, state güncellemelerinin senkronize olmasını sağlar.
            const form = document.getElementById('analysis-form');
            if (form) form.requestSubmit();
            setUrlToAnalyze(''); // State'i temizle
        }
    }, [urlToAnalyze]);

    const handleAnalyzeAgain = (historyUrl) => {
        setUrlToAnalyze(historyUrl);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            {/* Modern Centered Layout */}
            <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-6xl">
                {/* Header */}
                <motion.header 
                    initial={{ opacity: 0, y: -20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="text-center mb-8 sm:mb-10 md:mb-12 px-2 sm:px-0"
                >
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-3 sm:mb-4 leading-tight">
                        Video İçerik Analizi
                    </h1>
                    <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed px-4">
                        YouTube videolarınızı AI ile analiz edin ve önemli konu başlıklarını keşfedin
                    </p>
                </motion.header>

                {/* Ana Analiz Kartı */}
                <motion.section 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="mb-12"
                >
                    <Card className="border-0 shadow-2xl shadow-emerald-500/20 bg-white/80 backdrop-blur-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 sm:p-6">
                            <div className="flex items-center gap-3 sm:gap-4 text-white">
                                <div className="p-2 sm:p-3 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm">
                                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-bold">Yeni Video Analizi</h2>
                                    <p className="text-emerald-100 text-sm sm:text-base">YouTube video linkini yapıştırın ve AI analizi başlatın</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 sm:p-6 md:p-8">
                            <form onSubmit={handleAnalyze} id="analysis-form" className="space-y-4 sm:space-y-6">
                                <div className="space-y-2 sm:space-y-3">
                                    <label htmlFor="youtube_url" className="block text-sm font-semibold text-slate-700">
                                        YouTube Video Linki
                                    </label>
                                    <div className="relative">
                                        <Input 
                                            id="youtube_url" 
                                            type="text" 
                                            value={url} 
                                            onChange={e => setUrl(e.target.value)} 
                                            placeholder="https://www.youtube.com/watch?v=..." 
                                            className="w-full h-12 sm:h-14 md:h-16 text-sm sm:text-base md:text-lg pl-4 sm:pl-6 pr-12 sm:pr-16 rounded-xl sm:rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-300 bg-slate-50/50 touch-manipulation"
                                            style={{
                                                WebkitTapHighlightColor: 'transparent',
                                                WebkitTouchCallout: 'none',
                                                WebkitUserSelect: 'text',
                                                fontSize: '16px' // Prevents zoom on iOS
                                            }}
                                        />
                                        <div className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2">
                                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-500 rounded-lg flex items-center justify-center shadow-lg">
                                                <span className="text-white text-xs sm:text-sm font-bold">▶</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <Button 
                                    type="submit" 
                                    disabled={isLoading} 
                                    className="w-full h-12 sm:h-14 md:h-16 text-sm sm:text-base md:text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg touch-manipulation min-h-[44px] active:scale-95"
                                    style={{
                                        WebkitTapHighlightColor: 'transparent',
                                        WebkitTouchCallout: 'none',
                                        WebkitUserSelect: 'none',
                                        userSelect: 'none',
                                        touchAction: 'manipulation'
                                    }}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 sm:mr-3 md:mr-4 h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 animate-spin" />
                                            <span className="hidden sm:inline">Analiz Ediliyor...</span>
                                            <span className="sm:hidden">Analiz...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="mr-2 sm:mr-3 md:mr-4 h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                                            <span className="hidden sm:inline">AI Analizi Başlat</span>
                                            <span className="sm:hidden">Analiz Başlat</span>
                                        </>
                                    )}
                                </Button>
                            </form>
                        </div>
                    </Card>
                </motion.section>
                
                {/* Analiz Sonuçları */}
                <motion.section
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mb-8 sm:mb-10 md:mb-12 px-2 sm:px-0"
                >
                     <AnimatePresence mode="wait">
                        {isLoading && <EnhancedAnalysisStatusCard statusMessage={statusMessage} />}
                        {error && <InfoState title="Bir Hata Oluştu" message={error} icon={ServerCrash} />}
                        {analysisResult && <AnalysisResultCard result={analysisResult} url={currentAnalysisUrl} />}
                    </AnimatePresence>
                </motion.section>

                {/* Video Geçmişi Bölümü */}
                <motion.section 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <Card className="border-0 shadow-xl shadow-blue-500/10 bg-white/80 backdrop-blur-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 sm:p-6">
                            <div className="flex items-center gap-3 sm:gap-4 text-white">
                                <div className="p-2 sm:p-3 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm">
                                    <History className="h-5 w-5 sm:h-6 sm:w-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-bold">Analiz Geçmişi</h2>
                                    <p className="text-blue-100 text-sm sm:text-base">Önceki video analizlerinizi görüntüleyin ve yeniden analiz edin</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 sm:p-6 md:p-8">
                            {/* Search and Filter Component */}
                            {!historyLoading && history.length > 0 && (
                                <div className="mb-8">
                                    <VideoSearchFilter
                                        history={history}
                                        onFilteredResults={(filtered, query) => {
                                            setFilteredHistory(filtered);
                                            setSearchQuery(query);
                                        }}
                                    />
                                </div>
                            )}
                            
                            {/* Video Grid */}
                            <div>
                                {historyLoading && <HistorySkeleton />}
                                {!historyLoading && history.length === 0 && (
                                    <div className="text-center py-16">
                                        <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <FileQuestion className="h-12 w-12 text-slate-400" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-800 mb-3">Geçmişiniz Boş</h3>
                                        <p className="text-slate-600 text-lg">Henüz bir video analizi yapmadınız. Yukarıdaki formdan başlayın!</p>
                                    </div>
                                )}
                                {!historyLoading && history.length > 0 && (
                                    <motion.div
                                        initial="hidden"
                                        animate="visible"
                                        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
                                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6"
                                    >
                                        {filteredHistory.map(({ id, data }, index) => (
                                            <motion.div
                                                key={id}
                                                variants={{
                                                    hidden: { opacity: 0, y: 30, scale: 0.95 },
                                                    visible: { opacity: 1, y: 0, scale: 1 }
                                                }}
                                                transition={{ duration: 0.4, ease: "easeOut" }}
                                            >
                                                <EnhancedVideoCard
                                                    videoId={id}
                                                    data={data}
                                                    onAnalyzeAgain={handleAnalyzeAgain}
                                                    index={index}
                                                    showEmbeddedPlayer={true}
                                                    searchQuery={searchQuery}
                                                />
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                )}
                                
                                {/* No results message for filtered search */}
                                {!historyLoading && filteredHistory.length === 0 && history.length > 0 && (
                                    <div className="text-center py-12">
                                        <FileQuestion className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold text-slate-800 mb-2">Sonuç Bulunamadı</h3>
                                        <p className="text-slate-600">Arama kriterlerinize uygun analiz bulunamadı. Filtreleri temizleyerek tekrar deneyin.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </motion.section>
            </div>
        </div>
    );
}