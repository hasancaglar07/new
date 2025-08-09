"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Loader2, Search, BookOpen, Video, ArrowRight, ArrowLeft, FileQuestion, ServerCrash, X, Sparkles, ZoomIn, ZoomOut, RotateCcw, Download, BotMessageSquare, Newspaper, User, Clock, Library, Music, Trash2, Play, ListMusic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
// --- YARDIMCI FONKSİYONLAR VE BİLEŞENLER ---
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
function Highlight({ text, query }) {
    if (!text) return null;
    let sanitizedHtml = text.replace(/<b\b[^>]*>/gi, '<b class="font-bold text-primary bg-primary/10 px-0.5 rounded-sm">');
    sanitizedHtml = sanitizedHtml.replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary font-bold">$1</strong>');
    if (!query) return <span dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const parts = sanitizedHtml.split(new RegExp(`(${escapedQuery})`, 'gi'));
    const highlightedHtml = parts.map((part, i) => part.toLowerCase() === query.toLowerCase() ? `<mark class="bg-secondary/30 text-secondary-foreground px-1 rounded-md">${part.replace(/<b\b[^>]*>|<\/b>|\*\*|\*/gi, "")}</mark>` : part).join('');
    return <span dangerouslySetInnerHTML={{ __html: highlightedHtml }} />;
}
// Dialoglar ve Kartlar
function PagePreview({ pdfFile, pageNum }) {
    const [imageSrc, setImageSrc] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        setIsLoading(true); setError(null);
        const imageUrl = `${API_BASE_URL}/pdf/page_image?pdf_file=${encodeURIComponent(pdfFile)}&page_num=${pageNum}`;
        let objectUrl = null;
        fetch(imageUrl).then(res => res.ok ? res.blob() : Promise.reject(new Error("Resim yüklenemedi."))).then(blob => { objectUrl = URL.createObjectURL(blob); setImageSrc(objectUrl); }).catch(err => setError(err.message)).finally(() => setIsLoading(false));
        return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [pdfFile, pageNum]);
    return (<div className="relative flex justify-center items-center min-h-[200px] bg-slate-100 rounded-lg p-2 mt-2">{isLoading && <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />}{error && <div className="text-center text-red-600 p-4"><ServerCrash className="mx-auto h-8 w-8 mb-2" />{error}</div>}{imageSrc && !isLoading && <Image src={imageSrc} alt={`Sayfa ${pageNum} önizlemesi`} fill style={{ objectFit: 'contain' }} className="rounded-md" sizes="(max-width: 768px) 100vw, 50vw"/>}</div>);
}
function BookViewerDialog({ book, onClose, isOpen }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    useEffect(() => { if (book && isOpen) { const pageNumber = parseInt(book.sayfa, 10); setCurrentPage(pageNumber); setIsLoading(true); setError(null); setTotalPages(null); fetch(`${API_BASE_URL}/pdf/info?pdf_file=${encodeURIComponent(book.pdf_dosyasi)}`).then(res => res.ok ? res.json() : Promise.reject('Sayfa bilgisi alınamadı')).then(data => setTotalPages(data.total_pages)).catch(() => setTotalPages('?')); } }, [book, isOpen]);
    const imageUrl = useMemo(() => { if (!book) return null; return `${API_BASE_URL}/pdf/page_image?pdf_file=${encodeURIComponent(book.pdf_dosyasi)}&page_num=${currentPage}`; }, [book, currentPage]);
    useEffect(() => { if(imageUrl) { setIsLoading(true); setError(null); } }, [imageUrl]);
    useEffect(() => { const handleKeyDown = (e) => { if (!isOpen || !totalPages || isLoading) return; if (e.key === 'ArrowRight' && currentPage < totalPages) { setCurrentPage(p => p + 1); } else if (e.key === 'ArrowLeft' && currentPage > 1) { setCurrentPage(p => p - 1); } }; window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); }, [isOpen, currentPage, totalPages, isLoading]);
    const handleDownload = async () => { if (!imageUrl || isDownloading) return; setIsDownloading(true); try { const response = await fetch(imageUrl); const blob = await response.blob(); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${book.kitap.replace(/ /g, '_')}-Sayfa-${currentPage}.jpg`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href); } catch (err) { console.error("İndirme hatası:", err); } finally { setIsDownloading(false); } };
    if (!book) return null;
    return (<Dialog open={isOpen} onOpenChange={onClose}><DialogContent className="max-w-none w-screen h-screen p-0 gap-0 flex flex-col bg-slate-800"><DialogHeader className="p-3 border-b border-slate-700 flex-shrink-0 flex-row items-center justify-between text-white bg-slate-900/50"><DialogTitle className="text-lg md:text-xl text-slate-100 line-clamp-1">{book.kitap}</DialogTitle><Button aria-label="Kapat" variant="ghost" size="icon" onClick={onClose} className="text-slate-300 hover:text-white hover:bg-slate-700"><X className="h-6 w-6"/></Button></DialogHeader><div className="flex-grow w-full h-full flex justify-center items-center overflow-hidden relative">{isLoading && <Loader2 className="h-10 w-10 animate-spin text-slate-400 absolute z-10" />}{error && <div className="text-center text-red-500 p-4"><ServerCrash className="mx-auto h-8 w-8 mb-2" />{error}</div>}{imageUrl && !error && (<TransformWrapper limitToBounds={true} doubleClick={{ mode: 'reset' }} pinch={{ step: 1 }} wheel={{ step: 0.2 }}>{({ zoomIn, zoomOut, resetTransform }) => (<><div className="absolute top-4 right-4 z-20 flex flex-col gap-2"><Button aria-label="Yakınlaştır" onClick={() => zoomIn()} className="bg-slate-900/70 hover:bg-slate-800/90 text-white backdrop-blur-sm"><ZoomIn /></Button><Button aria-label="Uzaklaştır" onClick={() => zoomOut()} className="bg-slate-900/70 hover:bg-slate-800/90 text-white backdrop-blur-sm"><ZoomOut /></Button><Button aria-label="Görünümü sıfırla" onClick={() => resetTransform()} className="bg-slate-900/70 hover:bg-slate-800/90 text-white backdrop-blur-sm"><RotateCcw /></Button></div><TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full"><Image key={imageUrl} src={imageUrl} alt={`Sayfa ${currentPage}`} onLoad={() => setIsLoading(false)} onError={() => { setError("Bu sayfa yüklenemedi."); setIsLoading(false); }} fill style={{ objectFit: 'contain' }} className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`} sizes="100vw"/></TransformComponent></>)}</TransformWrapper>)}</div><DialogFooter className="flex-row justify-between items-center p-3 bg-slate-900/50 border-t border-slate-700 flex-shrink-0 text-white backdrop-blur-sm"><Button aria-label="Sayfayı indir" onClick={handleDownload} disabled={isDownloading} className="bg-slate-700 hover:bg-slate-600">{isDownloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}</Button><div className="flex items-center gap-2"><Button aria-label="Önceki sayfa" onClick={() => setCurrentPage(p => p > 1 ? p - 1 : p)} disabled={currentPage <= 1 || isLoading} className="bg-slate-700 hover:bg-slate-600"><ArrowLeft className="h-5 w-5" /></Button><div className="text-lg font-semibold tabular-nums"><span>{currentPage}</span><span className="text-slate-400 mx-1.5">/</span><span className="text-slate-300">{totalPages || '...'}</span></div><Button aria-label="Sonraki sayfa" onClick={() => setCurrentPage(p => totalPages && p < totalPages ? p + 1 : p)} disabled={!totalPages || currentPage >= totalPages || isLoading} className="bg-slate-700 hover:bg-slate-600"><ArrowRight className="h-5 w-5" /></Button></div><div className="w-12"></div></DialogFooter></DialogContent></Dialog>);
}
function ArticleViewerDialog({ articleId, onClose, isOpen }) { const [article, setArticle] = useState(null); const [isLoading, setIsLoading] = useState(true); useEffect(() => { if (isOpen && articleId) { setIsLoading(true); fetch(`${API_BASE_URL}/article/${articleId}`).then(res => res.json()).then(data => { setArticle(data); setIsLoading(false); }).catch(() => setIsLoading(false)); } }, [isOpen, articleId]); const articleDate = article ? new Date(article.scraped_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }) : ''; return ( <Dialog open={isOpen} onOpenChange={onClose}> <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0"> {isLoading ? ( <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div> ) : !article ? ( <div className="flex items-center justify-center h-full text-red-500">Makale yüklenemedi.</div> ) : ( <> <DialogHeader className="p-6 pb-4"> <DialogTitle className="text-3xl font-bold leading-tight">{article.title}</DialogTitle> <DialogDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-sm"> <span className="flex items-center gap-1.5"><User className="h-4 w-4" />{article.author}</span> <span className="flex items-center gap-1.5"><Library className="h-4 w-4" />{article.category}</span> <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{articleDate}</span> </DialogDescription> </DialogHeader> <Separator /> <div className="px-6 py-4 flex-grow overflow-y-auto"> <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: article.content }} /> </div> </> )} </DialogContent> </Dialog> );}
// *** DÜZELTİLDİ: Ses Çalar Pop-up'ı - timeline tıklama özelliği eklendi ***
function AudioPlayerDialog({ audio, onClose, isOpen }) {
    const audioRef = useRef(null);
    const [activeChapter, setActiveChapter] = useState(null);
    
    const audioSrc = `${API_BASE_URL}/audio/file/${audio?.mp3_filename}`;

    const jumpToTime = (timeString) => {
        const parts = timeString.split(':').map(Number);
        const seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        const audioElement = audioRef.current;
        if (audioElement && audioElement.readyState >= 3) {
            audioElement.currentTime = seconds;
            audioElement.play().catch(e => console.error("Oynatma hatası:", e));
            setActiveChapter(timeString);
        }
    };

    if (!audio) return null;
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-2xl">
                <DialogHeader className="p-6 pb-4">
                    <Pill className="bg-rose-100 text-rose-800 mb-2 w-fit">{audio.source}</Pill>
                    <DialogTitle className="text-2xl font-bold text-slate-800">{audio.title}</DialogTitle>
                </DialogHeader>
                <div className="px-6">
                    <audio
                        ref={audioRef}
                        src={audioSrc}
                        controls
                        className="w-full mb-6"
                        key={audio.mp3_filename}
                    />
                    {/* Chapters */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                        {audio.matching_chapters.map((chapter, index) => (
                            <button
                                key={index}
                                onClick={() => jumpToTime(chapter.time)}
                                className={`p-4 rounded-lg border transition-all text-left hover:shadow-sm ${
                                    activeChapter === chapter.time
                                        ? 'bg-rose-50 border-rose-300'
                                        : 'border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <Play className="h-5 w-5 mt-0.5 shrink-0 text-rose-600" />
                                    <div className="min-w-0">
                                        <span className="font-semibold text-sm text-rose-600">
                                            {chapter.time}
                                        </span>
                                        <p className="text-gray-700 text-base font-medium leading-relaxed mt-1">
                                            {chapter.title}
                                        </p>
                                    </div>
                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
function ArticleResultCard({ result, onReadClick, query, index }) { 
    const cardVariants = { 
        hidden: { opacity: 0, y: 30, scale: 0.95 }, 
        visible: { 
            opacity: 1, 
            y: 0, 
            scale: 1,
            transition: { 
                delay: index * 0.08, 
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94] 
            } 
        } 
    };
    
    return ( 
        <motion.div variants={cardVariants} className="h-full">
            <Card className="flex flex-col h-full overflow-hidden bg-white hover:shadow-2xl transition-all duration-300 group rounded-xl border border-gray-200 hover:border-slate-300 hover:-translate-y-1">
                {/* Header with gradient background */}
                <div className="bg-gradient-to-r from-slate-50/80 via-gray-50/60 to-slate-50/40 p-6 border-b border-slate-100">
                    <Pill className="bg-slate-600 text-white mb-3 w-fit font-medium shadow-sm">{result.kategori}</Pill>
                    <CardTitle className="text-xl font-bold text-slate-800 group-hover:text-slate-700 transition-colors line-clamp-2 leading-tight">
                        {result.baslik}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-3">
                        <User className="h-4 w-4 text-slate-500" />
                        <CardDescription className="text-slate-600 font-medium">{result.yazar}</CardDescription>
                    </div>
                </div>
                
                {/* Content */}
                <CardContent className="flex-grow p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Newspaper className="h-5 w-5 text-slate-500" />
                        <h3 className="text-lg font-semibold text-slate-700">Makale Alıntısı</h3>
                    </div>
                    <div className="relative">
                        <div className="absolute -left-3 top-0 w-1 h-full bg-gradient-to-b from-slate-400 to-slate-500 rounded-full"></div>
                        <p className="text-base text-slate-600 italic leading-relaxed line-clamp-4 pl-4">
                            "...<Highlight text={result.alinti} query={query} />..."
                        </p>
                    </div>
                </CardContent>
                
                {/* Footer */}
                <CardFooter className="p-6 pt-0">
                    <Button 
                        onClick={() => onReadClick(result.id)} 
                        className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold py-3 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                    >
                        <Newspaper className="h-5 w-5 mr-2" />
                        Makaleyi Oku
                    </Button>
                </CardFooter>
            </Card>
        </motion.div> 
    ); 
}
function BookResultCard({ result, onReadClick, query, index }) { 
    const cardVariants = { 
        hidden: { opacity: 0, y: 30, scale: 0.95, rotateX: 10 }, 
        visible: { 
            opacity: 1, 
            y: 0, 
            scale: 1, 
            rotateX: 0,
            transition: { 
                delay: index * 0.08, 
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94] 
            } 
        } 
    };
    
    return ( 
        <motion.div variants={cardVariants} className="h-full">
            <Card className="flex flex-col h-full overflow-hidden bg-white hover:shadow-2xl transition-all duration-300 group rounded-xl border border-gray-200 hover:border-emerald-200/60 hover:-translate-y-1">
                {/* Header with gradient background */}
                <div className="bg-gradient-to-r from-emerald-50/60 via-teal-50/40 to-green-50/30 p-6 border-b border-emerald-100/50">
                    <div className="flex items-center gap-2 mb-3">
                        <BookOpen className="h-5 w-5 text-emerald-600/80" />
                        <span className="text-sm font-medium text-emerald-700/90 bg-emerald-100/70 px-2 py-1 rounded-full">
                            Sayfa {result.sayfa}
                        </span>
                    </div>
                    <CardTitle className="text-xl font-bold text-slate-800 group-hover:text-emerald-700/90 transition-colors line-clamp-2 leading-tight">
                        {result.kitap}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-3">
                        <User className="h-4 w-4 text-emerald-600/70" />
                        <CardDescription className="text-slate-600 font-medium">{result.yazar}</CardDescription>
                    </div>
                </div>
                
                {/* Content */}
                <CardContent className="flex-grow p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 bg-gradient-to-b from-emerald-400/80 to-emerald-500/80 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-slate-700">Sayfa İçeriği</h3>
                    </div>
                    <div className="relative bg-gradient-to-r from-emerald-50/40 to-transparent p-4 rounded-lg border border-emerald-100/60">
                        <p className="text-base text-slate-600 italic leading-relaxed line-clamp-4">
                            "...<Highlight text={result.alinti} query={query} />..."
                        </p>
                    </div>
                </CardContent>
                
                {/* Footer with Preview */}
                <CardFooter className="flex-col items-start p-0 bg-gradient-to-r from-emerald-50/20 to-transparent">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1" className="border-b-0">
                            <AccordionTrigger className="text-sm font-semibold text-emerald-700/90 hover:no-underline px-6 py-4 hover:bg-emerald-50/30 transition-colors">
                                <div className="flex items-center gap-2">
                                    <ZoomIn className="h-4 w-4" />
                                    Sayfa {result.sayfa} Önizlemesi
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-4">
                                <div className="bg-white rounded-lg border border-emerald-200/60 p-3">
                                    <PagePreview pdfFile={result.pdf_dosyasi} pageNum={result.sayfa} />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                    <div className="p-6 w-full border-t border-emerald-100/50">
                        <Button 
                            onClick={() => onReadClick(result)} 
                            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-3 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                        >
                            <BookOpen className="h-5 w-5 mr-2" />
                            Bu Sayfayı Oku
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </motion.div>
    ); 
}
function AudioResultCard({ result, query, index, onPlayClick }) {
    const cardVariants = { 
        hidden: { opacity: 0, y: 30, scale: 0.95, rotateY: 5 }, 
        visible: { 
            opacity: 1, 
            y: 0, 
            scale: 1, 
            rotateY: 0,
            transition: { 
                delay: index * 0.08, 
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94] 
            } 
        } 
    };
    
    // Dosya adından temiz başlık çıkar
    const cleanTitle = result.title.replace(/\.(mp3|wav|m4a)$/i, '').replace(/_/g, ' ');
    
    return (
        <motion.div variants={cardVariants} className="h-full">
            <Card className="flex flex-col h-full overflow-hidden bg-white hover:shadow-2xl transition-shadow duration-300 group rounded-xl border border-gray-200 hover:border-rose-200">
                {/* Header with source tag */}
                <div className="bg-gradient-to-r from-rose-50/60 to-pink-50/40 p-6 border-b border-rose-100/50">
                    <Pill className="bg-rose-500/90 text-white mb-3 w-fit font-medium shadow-sm">{result.source}</Pill>
                    <CardTitle className="text-xl font-bold text-slate-800 group-hover:text-rose-700/90 transition-colors line-clamp-2 leading-tight">
                        <Highlight text={cleanTitle} query={query} />
                    </CardTitle>
                </div>
                
                {/* Content */}
                <CardContent className="flex-grow p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Music className="h-5 w-5 text-rose-500/80" />
                        <h3 className="text-lg font-semibold text-slate-700">Konu Başlıkları</h3>
                    </div>
                    <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                        {result.matching_chapters.slice(0, 5).map((chapter, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-rose-50/40 to-transparent hover:from-rose-100/60 transition-all duration-200 border border-rose-100/60">
                                <span className="font-mono text-sm font-bold text-rose-600/90 bg-white px-2 py-1 rounded-md shrink-0 shadow-sm">
                                    {chapter.time}
                                </span>
                                <span className="text-base font-medium text-slate-700 line-clamp-2 leading-relaxed">
                                    <Highlight text={chapter.title} query={query} />
                                </span>
                            </div>
                        ))}
                        {result.matching_chapters.length > 5 && (
                            <div className="text-center py-2">
                                <span className="text-sm text-slate-500 bg-slate-100/70 px-3 py-1 rounded-full">
                                    +{result.matching_chapters.length - 5} konu daha...
                                </span>
                            </div>
                        )}
                    </div>
                </CardContent>
                
                {/* Footer */}
                <CardFooter className="p-6 pt-0">
                   <Button 
                        onClick={() => onPlayClick(result)} 
                        className="w-full bg-gradient-to-r from-rose-500/90 to-pink-500/90 hover:from-rose-600/90 hover:to-pink-600/90 text-white font-semibold py-3 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                   >
                        <Play className="h-5 w-5 mr-2" />
                        Kaydı Dinle
                   </Button>
                </CardFooter>
            </Card>
        </motion.div>
    );
}
function VideoCard({ video, index }) { 
    const cardVariants = { 
        hidden: { opacity: 0, y: 30, scale: 0.95, rotateZ: 2 }, 
        visible: { 
            opacity: 1, 
            y: 0, 
            scale: 1, 
            rotateZ: 0,
            transition: { 
                delay: index * 0.08, 
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94] 
            } 
        } 
    };
    
    return ( 
        <motion.div variants={cardVariants} className="h-full flex">
            <Card className="w-full overflow-hidden bg-white hover:shadow-2xl transition-all duration-300 rounded-xl border border-gray-200 hover:border-red-200 group flex flex-col h-full hover:-translate-y-1"> 
                {/* Video Thumbnail with overlay */}
                <div className="aspect-video bg-gradient-to-br from-red-100/60 to-pink-100/40 relative overflow-hidden">
                    <iframe 
                        src={`https://www.youtube.com/embed/${video.id}`} 
                        title={video.title} 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen 
                        className="w-full h-full transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3">
                        <span className="bg-red-500/90 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-md flex items-center gap-1">
                            <Video className="h-3 w-3" />
                            YouTube
                        </span>
                    </div>
                </div>
                
                {/* Content */}
                <div className="flex flex-col flex-grow p-6">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-6 bg-gradient-to-b from-red-500/80 to-pink-500/80 rounded-full"></div>
                        <CardTitle className="text-lg font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-red-700/90 transition-colors">
                            {video.title}
                        </CardTitle>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-r from-red-400/80 to-pink-400/80 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-white" />
                        </div>
                        <CardDescription className="font-medium text-slate-600">{video.channel}</CardDescription>
                    </div>
                    
                    {/* Footer */}
                    <div className="mt-auto pt-4 border-t border-red-100/60">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Clock className="h-4 w-4 text-red-500/80" />
                                {formatDate(video.publishedTime)}
                            </div>
                        </div>
                        <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="block">
                            <Button className="w-full bg-gradient-to-r from-red-500/90 to-pink-500/90 hover:from-red-600/90 hover:to-pink-600/90 text-white font-semibold py-3 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg">
                                <Video className="h-5 w-5 mr-2" />
                                Videoyu İzle
                            </Button>
                        </a>
                    </div>
                </div>
            </Card>
        </motion.div>
    ); 
}
function AnalysisCard({ analysis, query, index }) { 
    const cardVariants = { 
        hidden: { opacity: 0, y: 30, scale: 0.95, rotateX: -5 }, 
        visible: { 
            opacity: 1, 
            y: 0, 
            scale: 1, 
            rotateX: 0,
            transition: { 
                delay: index * 0.08, 
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94] 
            } 
        } 
    };
    
    return ( 
        <motion.div variants={cardVariants} className="h-full flex"> 
            <Card className="w-full overflow-hidden bg-white hover:shadow-2xl transition-all duration-300 rounded-xl border border-gray-200 hover:border-purple-200 group flex flex-col h-full hover:-translate-y-1"> 
                {/* Video thumbnail with overlay */}
                <div className="aspect-video bg-gradient-to-br from-purple-100/60 to-violet-100/40 relative overflow-hidden"> 
                    <Image 
                        src={analysis.thumbnail} 
                        alt={analysis.title} 
                        fill 
                        style={{objectFit: 'cover'}} 
                        className="group-hover:scale-110 transition-transform duration-500" 
                        sizes="(max-width: 768px) 100vw, 50vw" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-3 left-3">
                        <span className="bg-purple-500/90 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-md flex items-center gap-1">
                            <BotMessageSquare className="h-3 w-3" />
                            AI Analiz
                        </span>
                    </div>
                </div>
                
                {/* Header */}
                <CardHeader className="p-6 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-purple-500/80 to-violet-500/80 rounded-full"></div>
                        <CardTitle className="text-lg font-bold text-slate-800 line-clamp-2 group-hover:text-purple-700/90 transition-colors">
                            <Highlight text={analysis.title} query={query} />
                        </CardTitle>
                    </div>
                </CardHeader>
                
                {/* Content - Chapters Accordion */}
                <CardContent className="p-0 flex-grow"> 
                    <Accordion type="single" collapsible className="w-full"> 
                        <AccordionItem value="item-1" className="border-b-0"> 
                            <AccordionTrigger className="text-sm font-semibold text-purple-700/90 hover:no-underline px-6 py-4 hover:bg-purple-50/30 transition-colors">
                                <div className="flex items-center gap-2">
                                    <ListMusic className="h-4 w-4" />
                                    Konu Başlıklarını Gör ({analysis.chapters.length})
                                </div>
                            </AccordionTrigger> 
                            <AccordionContent className="px-6 pb-4"> 
                                <div className="max-h-48 overflow-y-auto border border-purple-200/60 rounded-lg bg-gradient-to-r from-purple-50/40 to-transparent">
                                    <ul className="space-y-2 p-3"> 
                                        {analysis.chapters.map((chapter, chapterIndex) => ( 
                                            <li key={chapterIndex} className="p-2 rounded-md text-slate-700 hover:bg-purple-100/40 transition-colors"> 
                                                <Highlight text={chapter} query={query} /> 
                                            </li> 
                                        ))} 
                                    </ul>
                                </div>
                            </AccordionContent> 
                        </AccordionItem> 
                    </Accordion> 
                </CardContent>
                
                {/* Footer */}
                <CardFooter className="p-6 pt-4 border-t border-purple-100/60"> 
                    <a href={`https://www.youtube.com/watch?v=${analysis.video_id}`} target="_blank" rel="noopener noreferrer" className="w-full block"> 
                        <Button className="w-full bg-gradient-to-r from-purple-500/90 to-violet-500/90 hover:from-purple-600/90 hover:to-violet-600/90 text-white font-semibold py-3 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg">
                            <Video className="h-5 w-5 mr-2" />
                            Analiz Edilen Videoyu İzle
                        </Button> 
                    </a> 
                </CardFooter> 
            </Card> 
        </motion.div> 
    ); 
}
// Diğer Yardımcı Bileşenler
function Pill({ children, className }) { return <div className={`inline-block px-2 py-0.5 md:px-2.5 md:py-1 text-xs font-semibold rounded-full ${className}`}>{children}</div> }
function SuggestionTags({ onSelect }) {
    const suggestions = ["Rabıta", "Nefs", "Zikir", "Tasavvuf", "Mürşid", "Mektubat"];
    return (
        <div className="flex flex-wrap justify-center items-center gap-2 md:gap-3">
            <Sparkles className="h-5 w-5 text-slate-400 mr-2 shrink-0" />
            {suggestions.map(tag => (
                <motion.div key={tag} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full transition-all hover:bg-primary/10 hover:border-primary/30"
                        onClick={() => onSelect(tag)}>
                        {tag}
                    </Button>
                </motion.div>
            ))}
        </div>
    );
}
function LogoCarousel() {
    const logos = [ { src: '/logos/logo1.svg', alt: 'Logo 1' }, { src: '/logos/logo2.svg', alt: 'Logo 2' }, { src: '/logos/logo3.svg', alt: 'Logo 3' }, { src: '/logos/logo4.svg', alt: 'Logo 4' }, { src: '/logos/logo5.svg', alt: 'Logo 5' }, { src: '/logos/logo6.svg', alt: 'Logo 6' }, { src: '/logos/logo7.svg', alt: 'Logo 7' }, ];
    const extendedLogos = [...logos, ...logos, ...logos, ...logos];
    return (
        <div className="w-full mt-4 mb-2 overflow-hidden">
            <div className="relative [mask-image:linear-gradient(to-right,transparent,white_15%,white_85%,transparent)]">
                <div className="flex animate-scroll">
                    {extendedLogos.map((logo, index) => (
                        <div key={index} className="flex-shrink-0 mx-4 md:mx-6 flex items-center justify-center" style={{ width: '100px' }}>
                            <Image src={logo.src} alt={logo.alt} width={120} height={40} className="object-contain h-10 w-auto opacity-40 grayscale hover:grayscale-0 hover:opacity-80 transition-all duration-300" loading="lazy" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
function ResultsSkeleton() { 
    const quotes = [
        "Lütfen bekleyiniz...",
        "Kalpler ancak Allah'ı zikretmekle huzur bulur.",
        "Sabır, yolun anahtarıdır.",
        "Zikir, gönlün gıdasıdır.",
        "Tevekkül eden, asla yalnız kalmaz.",
        "İhlâs, amelin ruhudur."
    ];
    const [quoteIndex, setQuoteIndex] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setQuoteIndex((i) => (i + 1) % quotes.length), 2500);
        return () => clearInterval(t);
    }, []);
    return (
        <div className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 relative overflow-hidden"
                    >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[shimmer_2s_infinite]" 
                             style={{
                                 backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
                                 animation: 'shimmer 2s infinite'
                             }}
                        />
                        {/* Header */}
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-gradient-to-r from-slate-200 to-slate-300 rounded-full animate-pulse" />
                            <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-20 animate-pulse" />
                        </div>
                        {/* Title */}
                        <div className="space-y-2">
                            <div className="h-6 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-3/4 animate-pulse" />
                            <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-1/2 animate-pulse" />
                        </div>
                        {/* Content */}
                        <div className="pt-4 space-y-3">
                            <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-full animate-pulse" />
                            <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-full animate-pulse" />
                            <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-5/6 animate-pulse" />
                        </div>
                        {/* Button */}
                        <div className="h-12 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-full mt-6 animate-pulse" />
                    </motion.div>
                ))}
            </div>
            {/* Loading text with rotating quotes */}
            <motion.div 
                className="text-center mt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
            >
                <div className="flex items-center justify-center gap-3">
                    <div className="w-2 h-2 bg-[#177267] rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                    <div className="w-2 h-2 bg-[#177267] rounded-full animate-bounce" style={{animationDelay: '150ms', opacity: 0.7}} />
                    <div className="w-2 h-2 bg-[#177267] rounded-full animate-bounce" style={{animationDelay: '300ms', opacity: 0.5}} />
                </div>
                <motion.p
                    key={quoteIndex}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.4 }}
                    className="text-slate-700 mt-3 font-medium"
                >
                    {quotes[quoteIndex]}
                </motion.p>
            </motion.div>
        </div>
    )
}
function InfoState({ title, message, icon: Icon, onClearFilters }) { 
    return (
        <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center py-20 px-8 bg-gradient-to-br from-white via-slate-50/80 to-slate-100/60 rounded-3xl mt-8 max-w-3xl mx-auto border border-slate-200/50 shadow-xl backdrop-blur-sm relative overflow-hidden"
        >
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute top-10 left-10 w-20 h-20 bg-slate-400 rounded-full animate-pulse" />
                <div className="absolute bottom-10 right-10 w-16 h-16 bg-slate-500 rounded-full animate-pulse" style={{animationDelay: '1s'}} />
                <div className="absolute top-1/2 left-1/4 w-12 h-12 bg-slate-600 rounded-full animate-pulse" style={{animationDelay: '2s'}} />
            </div>
            
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                className="relative z-10"
            >
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center shadow-lg">
                    <Icon className="h-12 w-12 text-slate-500" />
                </div>
            </motion.div>
            
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="relative z-10"
            >
                <h3 className="text-3xl font-bold text-slate-800 mb-4 bg-gradient-to-r from-slate-700 to-slate-600 bg-clip-text">
                    {title}
                </h3>
                <p className="text-lg text-slate-600 leading-relaxed max-w-lg mx-auto">
                    {message}
                </p>
                
                {onClearFilters && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6, duration: 0.4 }}
                    >
                        <Button 
                            onClick={onClearFilters} 
                            className="mt-8 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold py-3 px-6 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        >
                            <X className="mr-2 h-5 w-5" /> 
                            Sorguyu Temizle
                        </Button>
                    </motion.div>
                )}
            </motion.div>
        </motion.div>
    ) 
}
// --- ANA SAYFA BİLEŞENİ ---
export default function HomePage() {
    const [query, setQuery] = useState("");
    const [allResults, setAllResults] = useState({ books: [], articles: [], videos: [], analyses: [], audio: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    // Modal state'leri
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [selectedBook, setSelectedBook] = useState(null);
    const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
    const [selectedArticleId, setSelectedArticleId] = useState(null);
    const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
    const [selectedAudio, setSelectedAudio] = useState(null);
    const [activeTab, setActiveTab] = useState('kitaplar');
    const performSearch = useCallback(async (currentQuery) => {
      if (!currentQuery.trim()) {
        setAllResults({ books: [], articles: [], videos: [], analyses: [], audio: [] });
        setError(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
          const allSearchUrl = new URL(`${API_BASE_URL}/search/all`);
          allSearchUrl.searchParams.append('q', currentQuery);
         
          const videoUrl = new URL(`${API_BASE_URL}/search/videos`);
          videoUrl.searchParams.append('q', currentQuery);
         
          const analysisUrl = new URL(`${API_BASE_URL}/search/analyses`);
          analysisUrl.searchParams.append('q', currentQuery);
          const audioUrl = new URL(`${API_BASE_URL}/search/audio`);
          audioUrl.searchParams.append('q', currentQuery);
         
          const [allRes, videoRes, analysisRes, audioRes] = await Promise.all([
            fetch(allSearchUrl).then(res => { if (!res.ok) throw new Error(`Arama sunucusu hatası: ${res.status}`); return res.json(); }),
            fetch(videoUrl).then(res => res.json()),
            fetch(analysisUrl).then(res => res.json()),
            fetch(audioUrl).then(res => res.json())
          ]);
          const books = allRes.sonuclar?.filter(r => r.type === 'book') || [];
          const articles = allRes.sonuclar?.filter(r => r.type === 'article') || [];
          setAllResults({
              books,
              articles,
              videos: videoRes.sonuclar || [],
              analyses: analysisRes.sonuclar || [],
              audio: audioRes.sonuclar || []
          });
         
          if (books.length > 0) setActiveTab('kitaplar');
          else if (articles.length > 0) setActiveTab('makaleler');
          else if (audioRes.sonuclar?.length > 0) setActiveTab('ses-kayitlari');
          else if (videoRes.sonuclar?.length > 0) setActiveTab('videolar');
          else if (analysisRes.sonuclar?.length > 0) setActiveTab('analizler');
          else setActiveTab('kitaplar');
      } catch (error) { setError("Arama yapılırken beklenmedik bir hata oluştu. " + error.message); }
      finally { setIsLoading(false); }
    }, []);
 
    useEffect(() => {
        const handler = setTimeout(() => {
            performSearch(query);
        }, 500);
        return () => clearTimeout(handler);
    }, [query, performSearch]);
  
    // Modal açma fonksiyonları
    const handleBookReadClick = (book) => { setSelectedBook(book); setIsBookModalOpen(true); };
    const handleArticleReadClick = (articleId) => { setSelectedArticleId(articleId); setIsArticleModalOpen(true); };
    const handleAudioPlayClick = (audio) => { setSelectedAudio(audio); setIsAudioModalOpen(true); };
   
    // Arama kutusunu ve filtreleri temizler
    const handleClearSearch = () => {
        setQuery("");
    };
  
    const hasResults = allResults.books.length > 0 || allResults.articles.length > 0 || allResults.videos.length > 0 || allResults.analyses.length > 0 || allResults.audio.length > 0;
 
    return (
      <div className="bg-slate-50 min-h-screen w-full font-sans">
        <main className="container mx-auto px-4 py-6 md:py-12">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, delay: 0.2 }} className="text-center mb-3"><p className="text-lg md:text-2xl text-slate-600" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</p></motion.div>
         
          <motion.header initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="text-center">
            <motion.div 
                className="flex justify-center mb-3"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ 
                    duration: 1.2, 
                    ease: [0.23, 1, 0.32, 1],
                    delay: 0.3
                }}
                whileHover={{ 
                    scale: 1.05,
                    transition: { duration: 0.3, ease: "easeOut" }
                }}
            >
                <div className="logo-container relative flex flex-col items-center">
                    {/* Dönen üst geometrik kısım */}
                    <motion.div
                        animate={{ 
                            rotate: 360
                        }}
                        transition={{
                            duration: 20,
                            ease: "linear",
                            repeat: Infinity,
                        }}
                        className="relative z-10"
                    >
                        <Image 
                            src="/logo-top.svg" 
                            alt="" 
                            width={375} 
                            height={225} 
                            className="w-auto h-36 sm:h-40 md:h-44 lg:h-48 xl:h-52 object-contain max-w-full"
                            priority
                        />
                    </motion.div>
                    
                    {/* Sabit alt metin kısmı */}
                    <div className="relative mt-0 sm:-mt-0.5 md:-mt-1">
                        <Image 
                            src="/logo-bottom.svg" 
                            alt="Mihmandar - Gönül Rehberiniz" 
                            width={375} 
                            height={112} 
                            className="w-auto h-16 sm:h-18 md:h-20 lg:h-22 xl:h-24 object-contain max-w-full cursor-pointer"
                            priority
                        />
                    </div>
                </div>
            </motion.div>
            <p className="mt-3 text-responsive text-slate-600 max-w-3xl mx-auto">Üstadlarımızın eserlerinde, sohbetlerinde derinlemesine arama yapın.</p>
            <LogoCarousel />
          </motion.header>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }} className="mt-6">
            <Card className="max-w-3xl mx-auto shadow-xl shadow-slate-200/70 border-t-4 border-primary bg-white/90 backdrop-blur-lg rounded-2xl">
              <CardContent className="p-4 md:p-6">
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 z-10" />
                    <Input placeholder="Konu, eser veya yazar adı..." value={query} onChange={(e) => setQuery(e.target.value)} className="text-base md:text-lg h-14 pl-12 pr-6 rounded-lg" />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {isLoading && <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />}
                    </div>
                  </div>
                  {/* DÜZELTİLDİ: Temizleme butonu arama kutusunun altına eklendi */}
                  {query.trim() && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearSearch}
                        className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 border-slate-300"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Aramayı Temizle
                      </Button>
                    </div>
                  )}
                </div>
                {!query.trim() && !isLoading && (<div className="pt-6 border-t border-slate-200/80 mt-6"><SuggestionTags onSelect={(tag) => setQuery(tag)} /></div>)}
              </CardContent>
            </Card>
          </motion.div>
          <div className="mt-8 md:mt-12 max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              {isLoading && !hasResults ? <motion.div key="loading"><ResultsSkeleton /></motion.div> :
               error ? <motion.div key="error"><InfoState title="Bir Hata Oluştu" message={error} icon={ServerCrash} /></motion.div> :
               !hasResults && query.trim() ? <motion.div key="no-results"><InfoState title="Sonuç Bulunamadı" message={`Aramanız için bir sonuç bulunamadı: "${query}". Lütfen yazımı kontrol edin.`} icon={FileQuestion} onClearFilters={handleClearSearch} /></motion.div> :
               !hasResults && !query.trim() ? <motion.div key="initial"><InfoState title="Aramaya Hazır" message="Hangi konuda araştırma yapmak istersiniz? Arama çubuğunu kullanabilirsiniz." icon={BookOpen} /></motion.div> :
               hasResults && (
                <motion.div key="results" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.02 } } }}>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                   
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-2 h-auto md:h-auto rounded-xl p-2 bg-slate-200/80">
                      <TabsTrigger value="kitaplar" disabled={allResults.books.length === 0} className="h-14 text-sm md:text-base data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-primary gap-2 rounded-lg font-semibold flex items-center justify-center px-2 col-span-2 md:col-span-1">
                        <BookOpen className="h-5 w-5 shrink-0"/> <span className="truncate">Kitaplar</span> <Pill className="bg-primary/10 text-primary ml-1.5">{allResults.books.length}</Pill>
                      </TabsTrigger>
                      <TabsTrigger value="makaleler" disabled={allResults.articles.length === 0} className="h-14 text-sm md:text-base data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-secondary gap-2 rounded-lg font-semibold flex items-center justify-center px-2">
                        <Newspaper className="h-5 w-5 shrink-0"/> <span className="truncate">Makaleler</span> <Pill className="bg-secondary/20 text-secondary-foreground ml-1.5">{allResults.articles.length}</Pill>
                      </TabsTrigger>
                      <TabsTrigger value="ses-kayitlari" disabled={allResults.audio.length === 0} className="h-14 text-sm md:text-base data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-rose-700 gap-2 rounded-lg font-semibold flex items-center justify-center px-2">
                          <Music className="h-5 w-5 shrink-0"/> <span className="truncate">Ses Kayıtları</span>
                          <Pill className="bg-rose-100 text-rose-800 ml-1.5">{allResults.audio.length}</Pill>
                      </TabsTrigger>
                      <TabsTrigger value="videolar" disabled={allResults.videos.length === 0} className="h-14 text-sm md:text-base data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-sky-700 gap-2 rounded-lg font-semibold flex items-center justify-center px-2">
                        <Video className="h-5 w-5 shrink-0"/> <span className="truncate">Videolar</span> <Pill className="bg-sky-100 text-sky-800 ml-1.5">{allResults.videos.length}</Pill>
                      </TabsTrigger>
                      <TabsTrigger value="analizler" disabled={allResults.analyses.length === 0} className="h-14 text-sm md:text-base data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-violet-700 gap-2 rounded-lg font-semibold flex items-center justify-center px-2">
                        <BotMessageSquare className="h-5 w-5 shrink-0"/> <span className="truncate">Analizler</span> <Pill className="bg-violet-100 text-violet-800 ml-1.5">{allResults.analyses.length}</Pill>
                      </TabsTrigger>
                    </TabsList>
                  
                    <TabsContent value="kitaplar" className="mt-8"><div className="grid grid-responsive gap-6 md:gap-8">{allResults.books.map((r, i) => <BookResultCard key={`book-${i}`} result={r} onReadClick={handleBookReadClick} query={query} index={i} />)}</div></TabsContent>
                    <TabsContent value="makaleler" className="mt-8"><div className="grid grid-responsive gap-6 md:gap-8">{allResults.articles.map((r, i) => <ArticleResultCard key={`article-${i}`} result={r} onReadClick={handleArticleReadClick} query={query} index={i} />)}</div></TabsContent>
                    <TabsContent value="ses-kayitlari" className="mt-8"><div className="grid grid-responsive gap-6 md:gap-8">{allResults.audio.map((r, i) => <AudioResultCard key={`audio-${i}`} result={r} onPlayClick={handleAudioPlayClick} query={query} index={i} />)}</div></TabsContent>
                    <TabsContent value="videolar" className="mt-8"><div className="grid grid-responsive gap-6 md:gap-8">{allResults.videos.map((v, i) => <VideoCard key={`video-${i}`} video={v} index={i} />)}</div></TabsContent>
                    <TabsContent value="analizler" className="mt-8"><div className="grid grid-responsive gap-6 md:gap-8">{allResults.analyses.map((a, i) => <AnalysisCard key={`analysis-${i}`} analysis={a} query={query} index={i} />)}</div></TabsContent>
                  </Tabs>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      
        <BookViewerDialog isOpen={isBookModalOpen} onClose={() => setIsBookModalOpen(false)} book={selectedBook} />
        <ArticleViewerDialog isOpen={isArticleModalOpen} onClose={() => setIsArticleModalOpen(false)} articleId={selectedArticleId} />
        <AudioPlayerDialog isOpen={isAudioModalOpen} onClose={() => setIsAudioModalOpen(false)} audio={selectedAudio} />
      </div>
    );
}