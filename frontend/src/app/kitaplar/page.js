// ai/frontend/src/app/kitaplar/page.js

"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Download, ArrowLeft, ArrowRight, BookOpen, Search, Library, ZoomIn, ZoomOut, RotateCcw, X } from "lucide-react";
import Image from 'next/image';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

// ShadCN UI ve Yerel Bileşenler
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// --- YARDIMCI FONKSİYONLAR ---

// Her yazar için deterministik ve estetik bir renk paleti döndürür.
const authorColorPalettes = [
    { border: "border-emerald-500", text: "text-emerald-600" },
    { border: "border-sky-500", text: "text-sky-600" },
    { border: "border-amber-500", text: "text-amber-600" },
    { border: "border-rose-500", text: "text-rose-600" },
    { border: "border-indigo-500", text: "text-indigo-600" },
    { border: "border-teal-500", text: "text-teal-600" },
    { border: "border-fuchsia-500", text: "text-fuchsia-600" },
];

const getAuthorColors = (authorName) => {
    if (!authorName) return authorColorPalettes[0];
    let hash = 0;
    for (let i = 0; i < authorName.length; i++) {
        hash += authorName.charCodeAt(i);
    }
    return authorColorPalettes[hash % authorColorPalettes.length];
};


// --- ALT BİLEŞENLER (TÜM DÜZELTMELERLE) ---

function BookViewerDialog({ book, onClose, isOpen }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (book) {
      setCurrentPage(1); 
      setTotalPages(book.toplam_sayfa || null);
    }
  }, [book]);

  const imageUrl = useMemo(() => {
    if (!book) return null;
    return `${API_BASE_URL}/pdf/page_image?pdf_file=${book.pdf_dosyasi}&page_num=${currentPage}`;
  }, [book, currentPage]);

  useEffect(() => { setIsLoading(true); }, [currentPage]);

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
      link.download = `${book.kitap_adi.replace(/ /g, '_')}-Sayfa-${currentPage}.jpg`;
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
          <DialogTitle className="text-lg md:text-xl text-slate-100 line-clamp-1">{book.kitap_adi}</DialogTitle>
          <Button aria-label="Kapat" variant="ghost" size="icon" onClick={onClose} className="text-slate-300 hover:text-white hover:bg-slate-700"><X className="h-6 w-6"/></Button>
        </DialogHeader>
        <div className="flex-grow w-full h-full flex justify-center items-center overflow-hidden relative">
          {isLoading && <Loader2 className="h-10 w-10 animate-spin text-slate-400 absolute z-10" />}
          {imageUrl && (
            <TransformWrapper limitToBounds={true} doubleClick={{ mode: 'reset' }} pinch={{ step: 1 }} wheel={{ step: 0.2 }}>
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                    <Button aria-label="Yakınlaştır" onClick={() => zoomIn()} className="bg-slate-900/70 hover:bg-slate-800/90 text-white backdrop-blur-sm"><ZoomIn /></Button>
                    <Button aria-label="Uzaklaştır" onClick={() => zoomOut()} className="bg-slate-900/70 hover:bg-slate-800/90 text-white backdrop-blur-sm"><ZoomOut /></Button>
                    <Button aria-label="Görünümü sıfırla" onClick={() => resetTransform()} className="bg-slate-900/70 hover:bg-slate-800/90 text-white backdrop-blur-sm"><RotateCcw /></Button>
                  </div>
                  <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                     <Image key={imageUrl} src={imageUrl} alt={`Sayfa ${currentPage}`} onLoad={() => setIsLoading(false)} onError={() => { setIsLoading(false); }} fill style={{ objectFit: 'contain' }} className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`} sizes="100vw"/>
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          )}
        </div>
        <DialogFooter className="flex-row justify-between items-center p-3 bg-slate-900/50 border-t border-slate-700 flex-shrink-0 text-white backdrop-blur-sm">
          <Button aria-label="Sayfayı indir" onClick={handleDownload} disabled={isDownloading} className="bg-slate-700 hover:bg-slate-600"><div className="w-12">{isDownloading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : <Download className="h-5 w-5 mx-auto" />}</div></Button>
          <div className="flex items-center gap-2">
            <Button aria-label="Önceki sayfa" onClick={() => setCurrentPage(p => p > 1 ? p - 1 : 1)} disabled={currentPage <= 1} className="bg-slate-700 hover:bg-slate-600"><ArrowLeft className="h-5 w-5" /></Button>
            <div className="text-lg font-semibold tabular-nums">
              <span>{currentPage}</span><span className="text-slate-400 mx-1.5">/</span><span className="text-slate-300">{totalPages || '...'}</span>
            </div>
            <Button aria-label="Sonraki sayfa" onClick={() => setCurrentPage(p => totalPages && p < totalPages ? p + 1 : p)} disabled={!totalPages || currentPage >= totalPages} className="bg-slate-700 hover:bg-slate-600"><ArrowRight className="h-5 w-5" /></Button>
          </div>
          <div className="w-12"></div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Highlight({ text, query }) {
    if (!query || !text) return text;
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    return <span>{parts.map((part, i) => part.toLowerCase() === query.toLowerCase() ? <mark key={i} className="bg-amber-200 text-amber-900 px-1 rounded-sm">{part}</mark> : part)}</span>;
}

function BookCard({ book, onReadClick, searchTerm, colors }) {
    return (
        <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3, ease: "easeInOut" }}>
            <Card className={`flex flex-col h-full overflow-hidden bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-xl border-t-4 ${colors.border}`}>
                <CardHeader className="p-6">
                    <CardTitle className="text-xl font-bold text-slate-800 leading-snug h-16 mb-2"><Highlight text={book.kitap_adi} query={searchTerm} /></CardTitle>
                    <p className={`text-sm font-semibold ${colors.text}`}>{book.toplam_sayfa} sayfa</p>
                </CardHeader>
                <CardContent className="flex-grow" />
                <CardFooter className="bg-slate-50/70 p-4">
                    <Button onClick={onReadClick} className="w-full bg-slate-700 hover:bg-slate-800 text-white"><BookOpen className="mr-2 h-4 w-4"/>Okumaya Başla</Button>
                </CardFooter>
            </Card>
        </motion.div>
    )
}

function LibrarySkeleton() {
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="text-center mb-12"><div className="h-10 bg-slate-200 rounded-lg w-1/2 mx-auto animate-pulse"></div><div className="h-5 bg-slate-200 rounded-md w-1/3 mx-auto mt-4 animate-pulse"></div></div>
            <div className="max-w-2xl mx-auto mb-12"><div className="h-28 bg-slate-200 rounded-xl animate-pulse"></div></div>
            <div className="h-10 bg-slate-300 rounded-md w-1/4 mb-8 animate-pulse"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">{[...Array(4)].map((_, j) => (<div key={j} className="bg-slate-200 h-60 rounded-xl animate-pulse"></div>))}</div>
        </div>
    )
}

function EmptyState() {
    return (<div className="text-center py-20 px-6"><Library className="mx-auto h-20 w-20 text-slate-400 mb-6" /><h3 className="text-2xl font-bold text-slate-700">Kitap Bulunamadı</h3><p className="text-slate-500 mt-2 max-w-md mx-auto">Arama kriterlerinize veya seçtiğiniz filtreye uyan bir kitap bulunamadı. Lütfen farklı bir arama yapmayı deneyin.</p></div>)
}

// --- ANA KÜTÜPHANE SAYFASI ---
export default function LibraryPage() {
    const [libraryData, setLibraryData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedBook, setSelectedBook] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAuthor, setSelectedAuthor] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchLibrary = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/books_by_author`);
                if (!response.ok) throw new Error("Veri sunucudan alınamadı.");
                const data = await response.json();
                setLibraryData(data.kutuphane || []);
            } catch (error) { console.error("Kütüphane verisi alınırken hata:", error); } 
            finally { setIsLoading(false); }
        }
        fetchLibrary();
    }, []);

    const filteredData = useMemo(() => {
        return libraryData.map(authorData => {
            if (selectedAuthor !== "all" && authorData.yazar !== selectedAuthor) return null;
            const filteredBooks = authorData.kitaplar.filter(book => book.kitap_adi.toLowerCase().includes(searchTerm.toLowerCase()));
            if (filteredBooks.length === 0) return null;
            return { ...authorData, kitaplar: filteredBooks };
        }).filter(Boolean);
    }, [libraryData, selectedAuthor, searchTerm]);

    const handleReadClick = (book) => { setSelectedBook(book); setIsModalOpen(true); };
    
    if (isLoading) return <LibrarySkeleton />;

    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="container mx-auto px-4 py-12 md:py-20">
                <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-12">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-slate-800">Eserler Kütüphanesi</h1>
                    <p className="mt-4 text-lg md:text-xl text-slate-600">Mübareklerin tüm eserlerine göz atın, filtreleyin ve okumaya başlayın.</p>
                </motion.header>

                <Card className="max-w-2xl mx-auto sticky top-5 z-40 bg-white/80 backdrop-blur-lg p-4 mb-12 rounded-2xl border shadow-lg shadow-slate-200/50">
                    <CardContent className="p-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select value={selectedAuthor} onValueChange={setSelectedAuthor}>
                            <SelectTrigger className="w-full h-12 text-base"><SelectValue placeholder="Bir yazar seçin..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tüm Yazarlar</SelectItem>
                                {libraryData.map(authorData => (<SelectItem key={authorData.yazar} value={authorData.yazar}>{authorData.yazar}</SelectItem>))}
                            </SelectContent>
                        </Select>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <Input placeholder="Kitap adı ile ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-12 text-base pl-10" />
                        </div>
                      </div>
                    </CardContent>
                </Card>

                <div className="space-y-16">
                    <AnimatePresence>
                        {filteredData.length > 0 ? (
                            filteredData.map((authorData, index) => {
                                const colors = getAuthorColors(authorData.yazar);
                                return (
                                <motion.section key={authorData.yazar} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }}>
                                    <h2 className={`text-3xl md:text-4xl font-bold text-slate-700 mb-8 pb-3 border-b-4 ${colors.border} inline-block`}>{authorData.yazar}</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                                        {authorData.kitaplar.map(book => (<BookCard key={book.kitap_adi} book={book} onReadClick={() => handleReadClick(book)} searchTerm={searchTerm} colors={colors} />))}
                                    </div>
                                </motion.section>
                            )})
                        ) : ( <EmptyState /> )}
                    </AnimatePresence>
                </div>
                
                {selectedBook && <BookViewerDialog book={selectedBook} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
            </div>
        </div>
    );
}