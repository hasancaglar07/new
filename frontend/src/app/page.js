// ai/frontend/src/app/page.js

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Check, ChevronsUpDown, Loader2, Search, BookOpen, Video, ArrowRight, Download, ArrowLeft, FileQuestion, ServerCrash, X, Sparkles, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ShadCN UI ve Yerel Bileşenler
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
const RESULTS_PER_PAGE = 12; // "Daha Fazla Yükle" için sayfa başına sonuç sayısı

// --- ★★★ "ULTIMATE" ALT BİLEŞENLER (FINAL SÜRÜM) ★★★ ---

const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
};

function Highlight({ text, query }) {
    if (!text) return null;
    if (!query) return <span dangerouslySetInnerHTML={{ __html: text.replace(/<b/g, '<b class="font-bold text-emerald-700 bg-emerald-100/50 px-0.5 rounded-sm"') }} />;
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    const highlightedHtml = parts.map((part, i) => part.toLowerCase() === query.toLowerCase() ? `<mark class="bg-lime-200 text-lime-900 px-1 rounded-md">${part.replace(/<b\b[^>]*>|<\/b>/gi, "")}</mark>` : part).join('');
    return <span dangerouslySetInnerHTML={{ __html: highlightedHtml }} />;
}

function PagePreview({ pdfFile, pageNum, onReadClick }) {
    const [imageSrc, setImageSrc] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setIsLoading(true); setError(null);
        const imageUrl = `${API_BASE_URL}/pdf/page_image?pdf_file=${pdfFile}&page_num=${pageNum}`;
        let objectUrl = null;
        fetch(imageUrl).then(res => res.ok ? res.blob() : Promise.reject(new Error("Resim yüklenemedi."))).then(blob => {
            objectUrl = URL.createObjectURL(blob);
            setImageSrc(objectUrl);
            setIsLoading(false);
        }).catch(err => {
            setError(err.message);
            setIsLoading(false);
        });
        return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [pdfFile, pageNum]);

    return (
        <div className="mt-4 space-y-4">
            <div className="relative flex justify-center items-center min-h-[200px] bg-slate-100 rounded-lg p-2">
                {isLoading && <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />}
                {error && <div className="text-center text-red-600 p-4"><ServerCrash className="mx-auto h-8 w-8 mb-2" />{error}</div>}
                {imageSrc && !isLoading && 
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageSrc} alt={`Sayfa ${pageNum} önizlemesi`} className="max-w-full max-h-[400px] rounded-md shadow-md" />
                }
            </div>
            <Button onClick={onReadClick} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">Bu Sayfayı Oku <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </div>
    );
}

function ResultCard({ result, onReadClick, query, index }) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} initial="hidden" animate="visible" transition={{ delay: index * 0.05 }} className="h-full">
      <Card className="flex flex-col h-full overflow-hidden bg-white hover:shadow-2xl transition-shadow duration-300 group rounded-xl border">
        <CardHeader className="p-6"><CardTitle className="text-xl font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">{result.kitap}</CardTitle><CardDescription>Yazar: {result.yazar}</CardDescription></CardHeader>
        <CardContent className="flex-grow p-6 pt-0"><p className="text-slate-600 italic line-clamp-5">"...<Highlight text={result.alinti} query={query} />..."</p></CardContent>
        <CardFooter className="p-0 pt-4 bg-slate-50/70">
            <Accordion type="single" collapsible className="w-full px-6">
                <AccordionItem value="item-1" className="border-b-0"><AccordionTrigger className="text-sm font-semibold text-emerald-700 hover:no-underline py-3">Sayfa {result.sayfa} Önizlemesi</AccordionTrigger>
                    <AccordionContent><PagePreview pdfFile={result.pdf_dosyasi} pageNum={result.sayfa} onReadClick={() => onReadClick(result)} /></AccordionContent>
                </AccordionItem>
            </Accordion>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

function VideoCard({ video, index }) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} initial="hidden" animate="visible" transition={{ delay: index * 0.05 }}>
      <Card className="overflow-hidden bg-white hover:shadow-2xl transition-shadow duration-300 rounded-xl border group flex flex-col h-full">
        <div className="aspect-video bg-slate-200 relative">
            <iframe src={`https://www.youtube.com/embed/${video.id}`} title={video.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full"></iframe>
            {video.duration && <Pill className="absolute bottom-2 right-2 bg-black/70 text-white backdrop-blur-sm">{video.duration}</Pill>}
        </div>
        <CardHeader className="flex-grow"><CardTitle className="text-base font-bold text-slate-800 line-clamp-2">{video.title}</CardTitle><CardDescription>{video.channel}</CardDescription></CardHeader>
        <CardFooter className="bg-slate-50/70 p-3 text-xs text-slate-500 flex justify-between items-center">
            <span>{formatDate(video.publishedTime)}</span>
            <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="sm" className="h-auto p-1 text-xs">İzle <ArrowRight className="ml-1 h-3 w-3"/></Button></a>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

function BookViewerDialog({ book, onClose, isOpen }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const goToNextPage = useCallback(() => { if (totalPages && currentPage < totalPages) setCurrentPage(p => p + 1); }, [currentPage, totalPages]);
  const goToPrevPage = useCallback(() => { if (currentPage > 1) setCurrentPage(p => p - 1); }, [currentPage]);
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') goToNextPage();
      if (e.key === 'ArrowLeft') goToPrevPage();
    };
    if (isOpen) { window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); }
  }, [isOpen, goToNextPage, goToPrevPage]);

  useEffect(() => {
    if (book) {
      setCurrentPage(book.sayfa); setIsLoading(true);
      fetch(`${API_BASE_URL}/pdf/info?${new URLSearchParams({ pdf_file: book.pdf_dosyasi })}`).then(res => res.ok ? res.json() : Promise.reject(res)).then(data => setTotalPages(data.total_pages)).catch(err => console.error("Toplam sayfa alınamadı", err));
    }
  }, [book]);

  useEffect(() => {
    setIsLoading(true);
    if (totalPages && book) {
        if (currentPage < totalPages) { new Image().src = `${API_BASE_URL}/pdf/page_image?pdf_file=${book.pdf_dosyasi}&page_num=${currentPage + 1}`; }
        if (currentPage > 1) { new Image().src = `${API_BASE_URL}/pdf/page_image?pdf_file=${book.pdf_dosyasi}&page_num=${currentPage - 1}`; }
    }
  }, [currentPage, book, totalPages]);

  if (!book) return null;
  const imageUrl = `${API_BASE_URL}/pdf/page_image?pdf_file=${book.pdf_dosyasi}&page_num=${currentPage}`;
  
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('Resim indirilemedi.');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${book.kitap.replace(/\s/g, '_')}_Sayfa_${currentPage}.png`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) { console.error("İndirme hatası:", error); } 
    finally { setIsDownloading(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[95vw] h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b flex-shrink-0"><DialogTitle className="text-xl md:text-2xl text-slate-800">{book.kitap}</DialogTitle></DialogHeader>
        <div className="flex-grow flex justify-center items-center bg-slate-200 overflow-hidden relative">
          {isLoading && <Loader2 className="h-10 w-10 animate-spin text-slate-500 absolute" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={`Sayfa ${currentPage}`} onLoad={() => setIsLoading(false)} className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`} />
        </div>
        <DialogFooter className="flex-row justify-between items-center p-3 bg-slate-100 border-t flex-shrink-0">
          <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-0 md:mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-0 md:mr-2 h-4 w-4" />}<span className="hidden md:inline">{isDownloading ? "İndiriliyor..." : "İndir"}</span></Button>
          <div className="flex items-center gap-2">
            <Button onClick={goToPrevPage} disabled={currentPage <= 1}><ArrowLeft className="h-4 w-4" /></Button>
            <Input type="number" value={currentPage} onChange={(e) => setCurrentPage(Number(e.target.value))} className="w-20 text-center font-bold" />
            <span className="font-semibold text-slate-600">/ {totalPages || '...'}</span>
            <Button onClick={goToNextPage} disabled={!totalPages || currentPage >= totalPages}><ArrowRight className="h-4 w-4" /></Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Pill({ children, className }) {
    return <div className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${className}`}>{children}</div>
}

function SuggestionTags({ onSelect }) {
    const suggestions = ["Rabıta", "Nefs", "Zikir", "Tasavvuf", "Mürşid", "Mektubat"];
    return (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.8} }} className="flex flex-wrap justify-center items-center gap-2 md:gap-3 mt-8"><Sparkles className="h-5 w-5 text-slate-400 mr-2" />{suggestions.map(tag => (<Button key={tag} variant="outline" size="sm" className="rounded-full transition-all hover:bg-emerald-50 hover:border-emerald-300" onClick={() => onSelect(tag)}>{tag}</Button>))}</motion.div>)
}

function ResultsSkeleton() {
    return (<div className="mt-8 space-y-8"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">{[...Array(6)].map((_, i) => (<div key={i} className="bg-white rounded-xl border p-4 space-y-4 animate-pulse"><div className="h-4 bg-slate-200 rounded w-3/4"></div><div className="h-3 bg-slate-200 rounded w-1/2"></div><div className="pt-4 space-y-2"><div className="h-3 bg-slate-200 rounded w-full"></div><div className="h-3 bg-slate-200 rounded w-full"></div><div className="h-3 bg-slate-200 rounded w-5/6"></div></div><div className="h-10 bg-slate-200 rounded w-full mt-4"></div></div>))}</div></div>)
}

function InfoState({ title, message, icon: Icon, onClearFilters }) {
    return (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16 px-6 bg-slate-100/80 rounded-2xl mt-8 max-w-2xl mx-auto"><Icon className="mx-auto h-16 w-16 text-slate-400 mb-4" /><h3 className="text-2xl font-bold text-slate-700">{title}</h3><p className="text-slate-500 mt-2">{message}</p>{onClearFilters && <Button onClick={onClearFilters} className="mt-6"><X className="mr-2 h-4 w-4" /> Filtreleri Temizle</Button>}</motion.div>)
}

// --- ANA SAYFA BİLEŞENİ ("YÖNETİCİ") ---
export default function HomePage() {
  const [authors, setAuthors] = useState([]);
  const [selectedAuthors, setSelectedAuthors] = useState(new Set());
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [allResults, setAllResults] = useState({ books: [], videos: [] });
  const [displayedResultsCount, setDisplayedResultsCount] = useState(RESULTS_PER_PAGE);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('kitaplar');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  
  const displayedBooks = useMemo(() => allResults.books.slice(0, displayedResultsCount), [allResults.books, displayedResultsCount]);
  const displayedVideos = useMemo(() => allResults.videos.slice(0, displayedResultsCount), [allResults.videos, displayedResultsCount]);

  useEffect(() => { 
      fetch(`${API_BASE_URL}/authors`).then(res => res.json()).then(data => setAuthors(data.authors || [])).catch(() => setError("Yazar listesi yüklenemedi. API bağlantısını kontrol edin."));
  }, []);

  const performSearch = useCallback(async (currentQuery, currentAuthors) => {
    if (!currentQuery.trim()) { setAllResults({ books: [], videos: [] }); return; }
    setIsLoading(true); setError(null);
    try {
        const bookUrl = new URL(`${API_BASE_URL}/search/books`);
        bookUrl.searchParams.append('q', currentQuery);
        currentAuthors.forEach(author => bookUrl.searchParams.append('authors', author));
        const videoUrl = new URL(`${API_BASE_URL}/search/videos`);
        videoUrl.searchParams.append('q', currentQuery);
        const [bookRes, videoRes] = await Promise.all([ fetch(bookUrl), fetch(videoUrl) ]);
        if (!bookRes.ok || !videoRes.ok) throw new Error("Arama sunucusuna ulaşılamadı.");
        const bookData = await bookRes.json();
        const videoData = await videoRes.json();
        setAllResults({ books: bookData?.sonuclar || [], videos: videoData?.sonuclar || [] });
        setDisplayedResultsCount(RESULTS_PER_PAGE);
        setActiveTab((bookData?.sonuclar?.length || 0) > 0 ? 'kitaplar' : 'videolar');
    } catch (error) { setError(error.message); } 
    finally { setIsLoading(false); }
  }, []);
  
  useEffect(() => {
    const handler = setTimeout(() => { setSearchQuery(query); }, 350);
    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => { performSearch(searchQuery, selectedAuthors); }, [searchQuery, selectedAuthors, performSearch]);

  const handleReadClick = (book) => { setSelectedBook(book); setIsModalOpen(true); };
  const handleSuggestionClick = (tag) => { setQuery(tag); };
  
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    // Yeni sonuçların render edilmesi için küçük bir gecikme ekleyerek
    // yükleme animasyonunun görünmesini sağlıyoruz.
    setTimeout(() => {
        setDisplayedResultsCount(c => c + RESULTS_PER_PAGE);
        setIsLoadingMore(false);
    }, 500); // 500ms
  };
  
  const hasResults = allResults.books.length > 0 || allResults.videos.length > 0;
  const showLoadMoreBooks = displayedBooks.length < allResults.books.length;
  const showLoadMoreVideos = displayedVideos.length < allResults.videos.length;
  const noResultsMessage = `'${searchQuery}' için herhangi bir sonuç bulunamadı. Lütfen farklı bir anahtar kelime deneyin veya filtrelerinizi kontrol edin.`;

  return (
    <div className="bg-slate-50 min-h-screen w-full font-sans">
      <main className="container mx-auto px-4 py-12 md:py-20">
        <motion.header initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-slate-800"><span className="bg-clip-text text-transparent bg-gradient-to-br from-emerald-600 to-green-500">Yediulya İlim Havuzu</span></h1>
          <p className="mt-4 md:mt-6 text-lg md:text-xl text-slate-600 max-w-3xl mx-auto">Üstadlarımızın eserlerinde ve sohbetlerinde, yapay zeka destekli modern bir arayüzle derinlemesine arama yapın.</p>
        </motion.header>

        {/* ★★★ DÜZELTME: "sticky" sınıfları buradan kaldırıldı ★★★ */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}>
          <Card className="max-w-3xl mx-auto shadow-xl shadow-slate-200/70 border-t-4 border-emerald-500 bg-white/90 backdrop-blur-lg rounded-2xl">
            <CardContent className="p-6 md:p-8">
              <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    {isLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 animate-spin" />}
                    <Input placeholder="Konu, eser veya yazar adı yazın..." value={query} onChange={(e) => setQuery(e.target.value)} className="text-lg h-14 pl-12 rounded-lg" />
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between h-12 text-base text-slate-600 rounded-lg">{selectedAuthors.size > 0 ? `${selectedAuthors.size} yazar seçildi` : "Yazara Göre Filtrele"}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button>
                    </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Yazar ara..." /><CommandList><CommandEmpty>Yazar bulunamadı.</CommandEmpty><CommandGroup>
                        {authors.map((author) => (<CommandItem key={author} onSelect={() => setSelectedAuthors(prev => { const newSet = new Set(prev); if (newSet.has(author)) newSet.delete(author); else newSet.add(author); return newSet; })} className="cursor-pointer"><Checkbox checked={selectedAuthors.has(author)} className="mr-2" /><span>{author}</span></CommandItem>))}
                    </CommandGroup></CommandList>{selectedAuthors.size > 0 && <div className="p-2 border-t"><Button variant="ghost" className="w-full h-8 text-sm" onClick={() => setSelectedAuthors(new Set())}><X className="mr-2 h-4 w-4"/>Filtreleri Temizle</Button></div>}</Command></PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
          {searchQuery.trim() === "" && <SuggestionTags onSelect={handleSuggestionClick} />}
        </motion.div>

        <div className="mt-12 md:mt-16 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {isLoading && searchQuery.trim() !== "" ? ( <motion.div key="loading"><ResultsSkeleton /></motion.div> ) : 
             error ? ( <motion.div key="error"><InfoState title="Bir Hata Oluştu" message={error} icon={ServerCrash} /></motion.div> ) : 
             !hasResults && searchQuery.trim() !== "" ? ( <motion.div key="no-results"><InfoState title="Sonuç Bulunamadı" message={noResultsMessage} icon={FileQuestion} onClearFilters={() => {setQuery(""); setSelectedAuthors(new Set());}} /></motion.div> ) :
             hasResults && (
              <motion.div key="results" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-14 rounded-xl p-2 bg-slate-200/80">
                    <TabsTrigger value="kitaplar" className="text-sm md:text-base gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-emerald-700 font-semibold"><BookOpen /> Kitaplar <Pill className="bg-emerald-100 text-emerald-800">{allResults.books.length}</Pill></TabsTrigger>
                    <TabsTrigger value="videolar" className="text-sm md:text-base gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-emerald-700 font-semibold"><Video /> Videolar <Pill className="bg-sky-100 text-sky-800">{allResults.videos.length}</Pill></TabsTrigger>
                  </TabsList>
                  <TabsContent value="kitaplar" className="mt-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">{displayedBooks.map((r, i) => <ResultCard key={`book-${i}`} result={r} onReadClick={handleReadClick} query={searchQuery} index={i} />)}</div>
                    {showLoadMoreBooks && <div className="mt-10 text-center"><Button onClick={handleLoadMore} disabled={isLoadingMore}>{isLoadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {isLoadingMore ? "Yükleniyor..." : "Daha Fazla Kitap Yükle"}</Button></div>}
                  </TabsContent>
                  <TabsContent value="videolar" className="mt-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">{displayedVideos.map((v, i) => <VideoCard key={`video-${i}`} video={v} index={i} />)}</div>
                    {showLoadMoreVideos && <div className="mt-10 text-center"><Button onClick={handleLoadMore} disabled={isLoadingMore}>{isLoadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {isLoadingMore ? "Yükleniyor..." : "Daha Fazla Video Yükle"}</Button></div>}
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      {selectedBook && <BookViewerDialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} book={selectedBook} />}
    </div>
  );
}