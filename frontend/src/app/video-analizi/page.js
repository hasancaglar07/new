// ai/frontend/src/app/video-analizi/page.js

"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, History, Loader2, ServerCrash, FileQuestion, Repeat, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const extractVideoId = (url) => {
    const match = url.match(/(?:v=|\/|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
};

// --- Alt Bileşenler ---

function AnalysisResultCard({ result, url }) {
    const videoId = extractVideoId(url);
    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <Card className="overflow-hidden">
                <CardHeader>
                    <CardTitle>Analiz Tamamlandı</CardTitle>
                    <CardDescription>{result.title}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="aspect-video bg-slate-200 rounded-lg overflow-hidden">
                        <iframe src={`https://www.youtube.com/embed/${videoId}`} title="YouTube video player" frameBorder="0" allowFullScreen className="w-full h-full"></iframe>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-3 text-slate-800">Konu Başlıkları</h3>
                        <ul className="space-y-2 text-sm max-h-60 overflow-y-auto border rounded-lg p-3 bg-slate-50/80">
                            {result.chapters.map((chapter, index) => (
                                <li key={index} className="p-2 rounded-md text-slate-700" dangerouslySetInnerHTML={{ __html: chapter.replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-700 font-bold">$1</strong>') }} />
                            ))}
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

function AnalysisStatusCard({ statusMessage }) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="text-center p-8 md:p-12">
                <Loader2 className="mx-auto h-12 w-12 text-emerald-500 animate-spin mb-4" />
                <CardTitle className="text-2xl">Analiz Sürüyor</CardTitle>
                <CardDescription className="mt-2 max-w-md mx-auto">
                    {statusMessage || "Bu işlem videonun uzunluğuna göre birkaç dakika sürebilir. Lütfen sayfadan ayrılmayın."}
                </CardDescription>
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
            <CardHeader>
                <CardTitle className="text-base font-bold text-slate-800 line-clamp-2">{data.title}</CardTitle>
            </CardHeader>
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

// --- Ana Sayfa Bileşeni ---
export default function VideoAnalysisPage() {
    const [url, setUrl] = useState("");
    const [currentAnalysisUrl, setCurrentAnalysisUrl] = useState("");
    const [analysisResult, setAnalysisResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [taskId, setTaskId] = useState(null);
    const [statusMessage, setStatusMessage] = useState("");
    const pollingIntervalRef = useRef(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/analysis_history`);
                const data = await response.json();
                setHistory(Object.entries(data).reverse());
            } catch (err) { console.error("Geçmiş alınamadı:", err); }
            finally { setHistoryLoading(false); }
        };
        fetchHistory();
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
                    setAnalysisResult(data.result);
                    setHistory(prev => [[extractVideoId(currentAnalysisUrl), data.result], ...prev.filter(([id]) => id !== extractVideoId(currentAnalysisUrl))]);
                    setIsLoading(false);
                    setTaskId(null);
                    setUrl("");
                } else if (data.status === "error") {
                    setError(data.message);
                    setIsLoading(false);
                    setTaskId(null);
                }
            } catch (err) {
                setError("Analiz durumu sorgulanırken bir hata oluştu.");
                setIsLoading(false);
                setTaskId(null);
            }
        };

        if (taskId) {
            pollingIntervalRef.current = setInterval(pollStatus, 5000);
        }
        return () => { if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current); };
    }, [taskId, currentAnalysisUrl]);

    const handleAnalyze = async (e) => {
        if (e) e.preventDefault();
        if (isLoading) return;
        const videoId = extractVideoId(url);
        if (!videoId) { setError("Lütfen geçerli bir YouTube linki girin."); return; }
        
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);
        setCurrentAnalysisUrl(url);
        setStatusMessage("Analiz görevi başlatılıyor...");

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

    const handleAnalyzeAgain = (historyUrl) => {
        setUrl(historyUrl);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="container mx-auto px-4 py-12 md:py-20">
                <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-12">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-slate-800">Video İçerik Analizi</h1>
                    <p className="mt-4 text-lg md:text-xl text-slate-600">Bir YouTube videosunu analiz ederek önemli konu başlıklarını çıkarın.</p>
                </motion.header>

                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                    <Card className="max-w-3xl mx-auto p-6 md:p-8">
                        <form onSubmit={handleAnalyze} className="space-y-4">
                            <div>
                                <label htmlFor="youtube_url" className="block mb-2 text-sm font-medium text-slate-700">YouTube Video Linki</label>
                                <Input id="youtube_url" type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="w-full h-12 text-base rounded-lg" />
                            </div>
                            <Button type="submit" disabled={isLoading} className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 text-white transition-all transform hover:scale-[1.02]">
                                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                                {isLoading ? 'Analiz Ediliyor...' : 'Analizi Başlat'}
                            </Button>
                        </form>
                    </Card>
                </motion.section>
                
                <section className="mt-12 max-w-3xl mx-auto">
                     <AnimatePresence mode="wait">
                        {isLoading && <AnalysisStatusCard statusMessage={statusMessage} />}
                        {error && <InfoState title="Bir Hata Oluştu" message={error} icon={ServerCrash} />}
                        {analysisResult && <AnalysisResultCard result={analysisResult} url={currentAnalysisUrl} />}
                    </AnimatePresence>
                </section>

                <section className="mt-20">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-700 mb-8 pb-3 border-b-4 border-emerald-500 inline-block">
                            <History className="inline-block h-8 w-8 mr-3 -mt-1 text-emerald-600" /> Analiz Geçmişi
                        </h2>
                        {historyLoading && <HistorySkeleton />}
                        {!historyLoading && history.length === 0 && <InfoState title="Geçmişiniz Boş" message="Henüz bir video analizi yapmadınız." icon={FileQuestion} />}
                        {!historyLoading && history.length > 0 && 
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                                {history.map(([videoId, data]) => (
                                    <HistoryCard key={videoId} videoId={videoId} data={data} onAnalyzeAgain={handleAnalyzeAgain} />
                                ))}
                            </div>
                        }
                    </motion.div>
                </section>
            </div>
        </div>
    );
}