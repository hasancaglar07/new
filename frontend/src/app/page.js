"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Check, ChevronsUpDown, Loader2, Search, BookOpen, Video, ArrowRight, ArrowLeft, FileQuestion, ServerCrash, X, Sparkles, ZoomIn, ZoomOut, RotateCcw, Download, BotMessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// --- Yardımcı Fonksiyonlar ve Bileşenler ---
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });

function Highlight({ text, query }) {
    if (!text) return null;
    let sanitizedHtml = text.replace(/<b\b[^>]*>/gi, '<b class="font-bold text-emerald-700 bg-emerald-100/50 px-0.5 rounded-sm">');
    sanitizedHtml = sanitizedHtml.replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-700 font-bold">$1</strong>');
    if (!query) return <span dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
   
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const parts = sanitizedHtml.split(new RegExp(`(${escapedQuery})`, 'gi'));
    const highlightedHtml = parts.map((part, i) => part.toLowerCase() === query.toLowerCase() ? `<mark class="bg-amber-200 text-amber-900 px-1 rounded-md">${part.replace(/<b\b[^>]*>|<\/b>|\*\*|\*/gi, "")}</mark>` : part).join('');
    return <span dangerouslySetInnerHTML={{ __html: highlightedHtml }} />;
}

function PagePreview({ pdfFile, pageNum }) {
    const [imageSrc, setImageSrc] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        setIsLoading(true); setError(null);
        const imageUrl = `${API_BASE_URL}/pdf/page_image?pdf_file=${encodeURIComponent(pdfFile)}&page_num=${pageNum}`;
        let objectUrl = null;
        fetch(imageUrl)
            .then(res => res.ok ? res.blob() : Promise.reject(new Error("Resim yüklenemedi.")))
            .then(blob => { objectUrl = URL.createObjectURL(blob); setImageSrc(objectUrl); })
            .catch(err => setError(err.message))
            .finally(() => setIsLoading(false));
        return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [pdfFile, pageNum]);
    return (<div className="relative flex justify-center items-center min-h-[200px] bg-slate-100 rounded-lg p-2 mt-2">
            {isLoading && <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />}
            {error && <div className="text-center text-red-600 p-4"><ServerCrash className="mx-auto h-8 w-8 mb-2" />{error}</div>}
            {imageSrc && !isLoading && <Image src={imageSrc} alt={`Sayfa ${pageNum} önizlemesi`} fill style={{ objectFit: 'contain' }} className="rounded-md" sizes="(max-width: 768px) 100vw, 50vw"/>}
        </div>);
}

function BookViewerDialog({ book, onClose, isOpen }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (book) {
      const pageNumber = parseInt(book.sayfa, 10);
      setCurrentPage(pageNumber); setIsLoading(true); setError(null); setTotalPages(null);
      fetch(`${API_BASE_URL}/pdf/info?pdf_file=${encodeURIComponent(book.pdf_dosyasi)}`)
        .then(res => res.ok ? res.json() : Promise.reject('Sayfa bilgisi alınamadı'))
        .then(data => setTotalPages(data.total_pages))
        .catch(() => setTotalPages('?'));
    }
  }, [book]);

  const imageUrl = useMemo(() => {
    if (!book) return null;
    return `${API_BASE_URL}/pdf/page_image?pdf_file=${encodeURIComponent(book.pdf_dosyasi)}&page_num=${currentPage}`;
  }, [book, currentPage]);
 
  useEffect(() => { setIsLoading(true); setError(null); }, [currentPage]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen || !totalPages) return;
      if (e.key === 'ArrowRight' && currentPage < totalPages) setCurrentPage(p => p + 1);
      else if (e.key === 'ArrowLeft' && currentPage > 1) setCurrentPage(p => p - 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, totalPages]);

  const handleDownload = async () => {
    if (!imageUrl || isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${book.kitap.replace(/ /g, '_')}-Sayfa-${currentPage}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) { console.error("İndirme hatası:", err); } 
    finally { setIsDownloading(false); }
  };

  if (!book) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-none w-screen h-screen p-0 gap-0 flex flex-col bg-slate-800">
        <DialogHeader className="p-3 border-b border-slate-700 flex-shrink-0 flex-row items-center justify-between text-white bg-slate-900/50">
          <DialogTitle className="text-lg md:text-xl text-slate-100 line-clamp-1">{book.kitap}</DialogTitle>
          <Button aria-label="Kapat" variant="ghost" size="icon" onClick={onClose} className="text-slate-300 hover:text-white hover:bg-slate-700"><X className="h-6 w-6"/></Button>
        </DialogHeader>
        <div className="flex-grow w-full h-full flex justify-center items-center overflow-hidden relative">
          {isLoading && <Loader2 className="h-10 w-10 animate-spin text-slate-400 absolute z-10" />}
          {error && <div className="text-center text-red-500 p-4"><ServerCrash className="mx-auto h-8 w-8 mb-2" />{error}</div>}
          {imageUrl && !error && (
            <TransformWrapper limitToBounds={true} doubleClick={{ mode: 'reset' }} pinch={{ step: 1 }} wheel={{ step: 0.2 }}>
              {({ zoomIn, zoomOut, resetTransform }) => (<>
                  <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                    <Button aria-label="Yakınlaştır" onClick={() => zoomIn()} className="bg-slate-900/70 hover:bg-slate-800/90 text-white backdrop-blur-sm"><ZoomIn /></Button>
                    <Button aria-label="Uzaklaştır" onClick={() => zoomOut()} className="bg-slate-900/70 hover:bg-slate-800/90 text-white backdrop-blur-sm"><ZoomOut /></Button>
                    <Button aria-label="Görünümü sıırla" onClick={() => resetTransform()} className="bg-slate-900/70 hover:bg-slate-800/90 text-white backdrop-blur-sm"><RotateCcw /></Button>
                  </div>
                  <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                     <Image key={imageUrl} src={imageUrl} alt={`Sayfa ${currentPage}`} onLoad={() => setIsLoading(false)} onError={() => { setError("Bu sayfa yüklenemedi."); setIsLoading(false); }} fill style={{ objectFit: 'contain' }} className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`} sizes="100vw"/>
                  </TransformComponent>
              </>)}
            </TransformWrapper>
          )}
        </div>
        <DialogFooter className="flex-row justify-between items-center p-3 bg-slate-900/50 border-t border-slate-700 flex-shrink-0 text-white backdrop-blur-sm">
          <Button aria-label="Sayfayı indir" onClick={handleDownload} disabled={isDownloading} className="bg-slate-700 hover:bg-slate-600">{isDownloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}</Button>
          <div className="flex items-center gap-2">
            <Button aria-label="Önceki sayfa" onClick={() => setCurrentPage(p => p > 1 ? p - 1 : p)} disabled={currentPage <= 1 || isLoading} className="bg-slate-700 hover:bg-slate-600"><ArrowLeft className="h-5 w-5" /></Button>
            <div className="text-lg font-semibold tabular-nums"><span>{currentPage}</span><span className="text-slate-400 mx-1.5">/</span><span className="text-slate-300">{totalPages || '...'}</span></div>
            <Button aria-label="Sonraki sayfa" onClick={() => setCurrentPage(p => totalPages && p < totalPages ? p + 1 : p)} disabled={!totalPages || currentPage >= totalPages || isLoading} className="bg-slate-700 hover:bg-slate-600"><ArrowRight className="h-5 w-5" /></Button>
          </div>
          <div className="w-12"></div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AnalysisCard({ analysis, query, index }) {
  const cardVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { delay: index * 0.05, ease: "easeOut" } }};
  return (
    <motion.div variants={cardVariants} className="h-full flex">
      <Card className="w-full overflow-hidden bg-white hover:shadow-2xl transition-shadow duration-300 rounded-xl border group flex flex-col h-full">
        <div className="aspect-video bg-slate-200 relative">
          <Image src={analysis.thumbnail} alt={analysis.title} fill style={{objectFit: 'cover'}} className="group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, 50vw" />
        </div>
        <CardHeader className="flex-grow">
          <CardTitle className="text-base font-bold text-slate-800 line-clamp-2"><Highlight text={analysis.title} query={query} /></CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="border-b-0">
              <AccordionTrigger className="text-sm font-semibold text-emerald-700 hover:no-underline px-6 py-2">Konu Başlıklarını Gör</AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <ul className="space-y-2 text-sm max-h-48 overflow-y-auto border rounded-lg p-3 bg-slate-50">
                  {analysis.chapters.map((chapter, index) => (
                    <li key={index} className="p-1 rounded-md text-slate-700">
                      <Highlight text={chapter} query={query} />
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
        <CardFooter className="bg-slate-50/70 p-3 mt-2 border-t text-xs text-slate-500 flex justify-end items-center">
            <a href={`https://www.youtube.com/watch?v=${analysis.video_id}`} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="h-auto p-1 text-xs">Videoyu İzle <ArrowRight className="ml-1 h-3 w-3"/></Button>
            </a>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

function ResultCard({ result, onReadClick, query, index }) {
  const cardVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { delay: index * 0.05, ease: "easeOut" } }};
  return (
    <motion.div variants={cardVariants} className="h-full"><Card className="flex flex-col h-full overflow-hidden bg-white hover:shadow-2xl transition-shadow duration-300 group rounded-xl border">
      <CardHeader className="p-6"><CardTitle className="text-xl font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">{result.kitap}</CardTitle><CardDescription>Yazar: {result.yazar}</CardDescription></CardHeader>
      <CardContent className="flex-grow p-6 pt-0"><p className="text-slate-600 italic line-clamp-5">"...<Highlight text={result.alinti} query={query} />..."</p></CardContent>
      <CardFooter className="flex-col items-start p-0 bg-slate-50/70">
        <Accordion type="single" collapsible className="w-full px-6"><AccordionItem value="item-1" className="border-b-0"><AccordionTrigger className="text-sm font-semibold text-emerald-700 hover:no-underline py-3">Sayfa {result.sayfa} Önizlemesi</AccordionTrigger><AccordionContent><PagePreview pdfFile={result.pdf_dosyasi} pageNum={result.sayfa} /></AccordionContent></AccordionItem></Accordion>
        <div className="p-4 w-full border-t"><Button onClick={() => onReadClick(result)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">Bu Sayfayı Oku <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
      </CardFooter></Card></motion.div>);
}

function VideoCard({ video, index }) {
  const cardVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { delay: index * 0.05, ease: "easeOut" } }};
  return (
    <motion.div variants={cardVariants} className="h-full flex"><Card className="w-full overflow-hidden bg-white hover:shadow-2xl transition-shadow duration-300 rounded-xl border group flex flex-col h-full">
      <div className="aspect-video bg-slate-200 relative"><iframe src={`https://www.youtube.com/embed/${video.id}`} title={video.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full"></iframe></div>
      <CardHeader className="flex-grow"><CardTitle className="text-base font-bold text-slate-800 line-clamp-2">{video.title}</CardTitle><CardDescription>{video.channel}</CardDescription></CardHeader>
      <CardFooter className="bg-slate-50/70 p-3 text-xs text-slate-500 flex justify-between items-center"><span>{formatDate(video.publishedTime)}</span><a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="sm" className="h-auto p-1 text-xs">İzle <ArrowRight className="ml-1 h-3 w-3"/></Button></a></CardFooter></Card></motion.div>);
}

function Pill({ children, className }) { return <div className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${className}`}>{children}</div> }

function SuggestionTags({ onSelect }) {
    const suggestions = ["Rabıta", "Nefs", "Zikir", "Tasavvuf", "Mürşid", "Mektubat"];
    return (<div className="flex flex-wrap justify-center items-center gap-2 md:gap-3"><Sparkles className="h-5 w-5 text-slate-400 mr-2 shrink-0" />{suggestions.map(tag => (<Button key={tag} variant="outline" size="sm" className="rounded-full transition-all hover:bg-emerald-50 hover:border-emerald-300" onClick={() => onSelect(tag)}>{tag}</Button>))}</div>)
}

function ResultsSkeleton() { return (<div className="mt-8 space-y-8"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">{[...Array(6)].map((_, i) => (<div key={i} className="bg-white rounded-xl border p-4 space-y-4 animate-pulse"><div className="h-5 bg-slate-200 rounded w-3/4"></div><div className="h-4 bg-slate-200 rounded w-1/2"></div><div className="pt-4 space-y-2"><div className="h-4 bg-slate-200 rounded w-full"></div><div className="h-4 bg-slate-200 rounded w-full"></div><div className="h-4 bg-slate-200 rounded w-5/6"></div></div><div className="h-10 bg-slate-200 rounded w-full mt-4"></div></div>))}</div></div>) }
function InfoState({ title, message, icon: Icon, onClearFilters }) { return (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16 px-6 bg-slate-100/80 rounded-2xl mt-8 max-w-2xl mx-auto"><Icon className="mx-auto h-16 w-16 text-slate-400 mb-4" /><h3 className="text-2xl font-bold text-slate-700">{title}</h3><p className="text-slate-500 mt-2">{message}</p>{onClearFilters && <Button onClick={onClearFilters} className="mt-6"><X className="mr-2 h-4 w-4" /> Filtreleri Temizle</Button>}</motion.div>) }

export default function HomePage() {
  const [authors, setAuthors] = useState([]);
  const [selectedAuthors, setSelectedAuthors] = useState(new Set());
  const [query, setQuery] = useState("");
  const [allResults, setAllResults] = useState({ books: [], videos: [], analyses: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [activeTab, setActiveTab] = useState('kitaplar');

  useEffect(() => { fetch(`${API_BASE_URL}/authors`).then(res => res.json()).then(data => setAuthors(data.authors || [])).catch(() => setError("Yazar listesi yüklenemedi.")); }, []);
 
  const performSearch = useCallback(async (currentQuery, currentAuthors) => {
    if (!currentQuery.trim()) { setAllResults({ books: [], videos: [], analyses: [] }); setError(null); return; }
    setIsLoading(true); setError(null);
    try {
        const bookUrl = new URL(`${API_BASE_URL}/search/books`);
        bookUrl.searchParams.append('q', currentQuery);
        currentAuthors.forEach(author => bookUrl.searchParams.append('authors', author));
        
        const videoUrl = new URL(`${API_BASE_URL}/search/videos`);
        videoUrl.searchParams.append('q', currentQuery);

        const analysisUrl = new URL(`${API_BASE_URL}/search/analyses`);
        analysisUrl.searchParams.append('q', currentQuery);

        const [bookRes, videoRes, analysisRes] = await Promise.all([ fetch(bookUrl), fetch(videoUrl), fetch(analysisUrl) ]);
        if (!bookRes.ok || !videoRes.ok || !analysisRes.ok) throw new Error("Arama sunucusuna ulaşılamadı.");
       
        const bookData = await bookRes.json(); 
        const videoData = await videoRes.json();
        const analysisData = await analysisRes.json();

        setAllResults({ 
          books: bookData?.sonuclar || [], 
          videos: videoData?.sonuclar || [],
          analyses: analysisData?.sonuclar || []
        });

        const bookCount = bookData?.sonuclar?.length || 0;
        const videoCount = videoData?.sonuclar?.length || 0;
        const analysisCount = analysisData?.sonuclar?.length || 0;

        if (bookCount > 0) setActiveTab('kitaplar');
        else if (videoCount > 0) setActiveTab('videolar');
        else if (analysisCount > 0) setActiveTab('analizler');
        else setActiveTab('kitaplar');

    } catch (error) { setError(error.message); }
    finally { setIsLoading(false); }
  }, []);
 
  useEffect(() => { const handler = setTimeout(() => { performSearch(query, Array.from(selectedAuthors)); }, 500); return () => clearTimeout(handler); }, [query, selectedAuthors, performSearch]);
  
  const handleReadClick = (book) => { setSelectedBook(book); setIsModalOpen(true); };
  const handleAuthorChange = (author) => { const newSet = new Set(selectedAuthors); newSet.has(author) ? newSet.delete(author) : newSet.add(author); setSelectedAuthors(newSet); };
  const handleClearFilters = () => { setQuery(""); setSelectedAuthors(new Set()); };
  
  const hasResults = allResults.books.length > 0 || allResults.videos.length > 0 || allResults.analyses.length > 0;
 
  return (
    <div className="bg-slate-50 min-h-screen w-full font-sans">
      <main className="container mx-auto px-4 py-12 md:py-20">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, delay: 0.2 }} className="text-center mb-8"><p className="text-2xl md:text-3xl text-slate-600" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</p></motion.div>
        <motion.header initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-slate-800"><span className="bg-clip-text text-transparent bg-gradient-to-br from-emerald-600 to-green-500">Yediulya E-kütüphanesi</span></h1>
          <p className="mt-4 md:mt-6 text-lg md:text-xl text-slate-600 max-w-3xl mx-auto">Üstadlarımızın eserlerinde, sohbetlerinde ve analizlerinde derinlemesine arama yapın.</p>
        </motion.header>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}className="">
          <Card className="max-w-3xl mx-auto shadow-xl shadow-slate-200/70 border-t-4 border-emerald-500 bg-white/90 backdrop-blur-lg rounded-2xl">
            <CardContent className="p-6 md:p-8">
              <div className="space-y-4">
                <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 z-10" /><Input placeholder="Konu, eser veya yazar adı..." value={query} onChange={(e) => setQuery(e.target.value)} className="text-lg h-14 pl-12 pr-12 rounded-lg" />{isLoading && (<div className="absolute right-4 top-1/2 -translate-y-1/2"><Loader2 className="h-5 w-5 text-slate-400 animate-spin" /></div>)}</div>
                <div className="flex items-center gap-2">
                   <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-12 text-base text-slate-600 rounded-lg">{selectedAuthors.size > 0 ? `${selectedAuthors.size} yazar seçildi` : "Yazara Göre Filtrele"}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Yazar ara..." /><CommandList><CommandEmpty>Yazar bulunamadı.</CommandEmpty><CommandGroup>{authors.map((author) => (<CommandItem key={author} onSelect={() => handleAuthorChange(author)}><Checkbox checked={selectedAuthors.has(author)} className="mr-2" /><span>{author}</span></CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover>
                   {selectedAuthors.size > 0 && (<Button aria-label="Filtreleri temizle" variant="ghost" size="icon" className="h-12 w-12 shrink-0 text-slate-500 hover:text-slate-800" onClick={() => setSelectedAuthors(new Set())}><X className="h-5 w-5" /></Button>)}
                </div>
              </div>
              {!query.trim() && (<div className="pt-6 border-t border-slate-200/80 mt-6"><SuggestionTags onSelect={(tag) => setQuery(tag)} /></div>)}
            </CardContent>
          </Card>
        </motion.div>
        <div className="mt-12 md:mt-16 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {isLoading ? <motion.div key="loading"><ResultsSkeleton /></motion.div> :
             error ? <motion.div key="error"><InfoState title="Bir Hata Oluştu" message={error} icon={ServerCrash} /></motion.div> :
             !hasResults && query.trim() ? <motion.div key="no-results"><InfoState title="Sonuç Bulunamadı" message={`${query} için bir sonuç bulunamadı. Yazımı kontrol edebilir veya filtreleri temizleyebilirsiniz.`} icon={FileQuestion} onClearFilters={handleClearFilters} /></motion.div> :
             !hasResults && !query.trim() ? <motion.div key="initial"><InfoState title="Aramaya Hazır" message="Hangi konuda araştırma yapmak istersiniz? Arama çubuğunu kullanabilirsiniz." icon={BookOpen} /></motion.div> :
             hasResults && (
              <motion.div key="results" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.02 } } }}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 h-14 rounded-xl p-2 bg-slate-200/80">
                    <TabsTrigger value="kitaplar" className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-emerald-700 text-sm md:text-base gap-2 rounded-lg font-semibold"><BookOpen /> Kitaplar <Pill className="bg-emerald-100 text-emerald-800">{allResults.books.length}</Pill></TabsTrigger>
                    <TabsTrigger value="videolar" className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-emerald-700 text-sm md:text-base gap-2 rounded-lg font-semibold"><Video /> Videolar <Pill className="bg-sky-100 text-sky-800">{allResults.videos.length}</Pill></TabsTrigger>
                    <TabsTrigger value="analizler" className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-emerald-700 text-sm md:text-base gap-2 rounded-lg font-semibold"><BotMessageSquare /> Analizler <Pill className="bg-violet-100 text-violet-800">{allResults.analyses.length}</Pill></TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="kitaplar" className="mt-8"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">{allResults.books.map((r, i) => <ResultCard key={`book-${i}`} result={r} onReadClick={handleReadClick} query={query} index={i} />)}</div></TabsContent>
                  <TabsContent value="videolar" className="mt-8"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">{allResults.videos.map((v, i) => <VideoCard key={`video-${i}`} video={v} index={i} />)}</div></TabsContent>
                  
                  <TabsContent value="analizler" className="mt-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                      {allResults.analyses.map((analysis, i) => (
                        <AnalysisCard key={`analysis-${i}`} analysis={analysis} query={query} index={i} />
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <BookViewerDialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} book={selectedBook} />
    </div>
  );
}