// ai/frontend/src/app/kitaplar/page.js

"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Download, ArrowLeft, ArrowRight, BookOpen, Search, Library, ZoomIn, ZoomOut, RotateCcw, X, Share2 } from "lucide-react";
import Image from 'next/image';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import dynamic from 'next/dynamic';

// ShadCN UI ve Yerel Bileşenler
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// --- YARDIMCI FONKSİYONLAR ---

// Tek soft yeşil tema paleti - logonuzun renginde
const authorColorPalettes = [
    { border: "border-emerald-400/60", text: "text-emerald-700/90", bg: "bg-emerald-50/40", accent: "emerald" },
];

const getAuthorColors = (authorName) => {
    // Tüm yazarlar için aynı soft yeşil tema
    return authorColorPalettes[0];
};


// --- ALT BİLEŞENLER (TÜM DÜZELTMELERLE) ---

function BookViewerDialog({ book, onClose, isOpen }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pageInput, setPageInput] = useState('');

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

  const pdfUrl = useMemo(() => {
    if (!book) return null;
    // Önce doğrudan dosya URL'si (Backblaze) varsa onu kullan, yoksa backend proxy
    return book.pdf_url || `${API_BASE_URL}/pdf/access?pdf_file=${encodeURIComponent(book.pdf_dosyasi)}`;
  }, [book]);

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


  const shareCurrentPage = async () => {
    const pageLink = `${API_BASE_URL}/pdf/page_image?pdf_file=${book.pdf_dosyasi}&page_num=${currentPage}`;
    const text = `${book.kitap_adi} - Sayfa ${currentPage}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: book.kitap_adi, text, url: pageLink });
      } else {
        const wa = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n' + pageLink)}`;
        window.open(wa, '_blank');
      }
    } catch {}
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
                    <div className="flex flex-col gap-2">
                      <Button aria-label="Sayfayı paylaş" onClick={shareCurrentPage} className="bg-emerald-700 hover:bg-emerald-600 text-white backdrop-blur-sm"><Share2 /></Button>
                      {pdfUrl && <Button aria-label="PDF'yi yeni sekmede aç" onClick={()=> window.open(pdfUrl, '_blank')} className="bg-slate-700 hover:bg-slate-600 text-white">PDF</Button>}
                    </div>
                  </div>
                  <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                    <Image key={imageUrl} src={imageUrl} alt={`Sayfa ${currentPage}`} onLoad={() => setIsLoading(false)} onError={() => { setIsLoading(false); }} fill style={{ objectFit: 'contain' }} className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`} sizes="100vw"/>
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          )}
        </div>
        <DialogFooter className="flex-col gap-3 md:flex-row md:gap-0 md:justify-between md:items-center p-3 bg-slate-900/50 border-t border-slate-700 flex-shrink-0 text-white backdrop-blur-sm">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button aria-label="Sayfayı indir" onClick={handleDownload} disabled={isDownloading} className="bg-slate-700 hover:bg-slate-600"><div className="w-12">{isDownloading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : <Download className="h-5 w-5 mx-auto" />}</div></Button>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button aria-label="Önceki sayfa" onClick={() => setCurrentPage(p => p > 1 ? p - 1 : 1)} disabled={currentPage <= 1} className="bg-slate-700 hover:bg-slate-600 h-12 w-12 md:h-10 md:w-10"><ArrowLeft className="h-5 w-5" /></Button>
            <div className="flex items-center gap-2">
              <input value={pageInput} onChange={(e)=> setPageInput(e.target.value.replace(/\D/g,''))} placeholder={`${currentPage}`} className="w-20 h-10 px-2 rounded bg-slate-800 border border-slate-700 text-center" />
              <Button onClick={()=>{ const n=parseInt(pageInput||'0',10); if (n && totalPages && n>=1 && n<=totalPages) setCurrentPage(n); }} className="bg-slate-700 hover:bg-slate-600">Git</Button>
            </div>
            <div className="text-lg font-semibold tabular-nums">
              <span>{currentPage}</span><span className="text-slate-400 mx-1.5">/</span><span className="text-slate-300">{totalPages || '...'}</span>
            </div>
            <Button aria-label="Sonraki sayfa" onClick={() => setCurrentPage(p => totalPages && p < totalPages ? p + 1 : p)} disabled={!totalPages || currentPage >= totalPages} className="bg-slate-700 hover:bg-slate-600 h-12 w-12 md:h-10 md:w-10"><ArrowRight className="h-5 w-5" /></Button>
          </div>
          {/* metin önizleme kaldırıldı */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Highlight({ text, query }) {
    if (!query || !text) return text;
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    return <span>{parts.map((part, i) => part.toLowerCase() === query.toLowerCase() ? <mark key={i} className="bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-md font-medium">{part}</mark> : part)}</span>;
}

function BookCard({ book, onReadClick, searchTerm, colors }) {
    const cardVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: { 
            opacity: 1, 
            y: 0, 
            scale: 1,
            transition: { 
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94]
            }
        }
    };

    return (
        <motion.div 
            layout 
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            whileHover={{ 
                y: -8,
                transition: { duration: 0.3, ease: "easeOut" }
            }}
        >
            <Card className={`flex flex-col h-full overflow-hidden bg-white hover:shadow-2xl transition-all duration-300 rounded-xl border border-gray-200 hover:${colors.border.replace('/70', '')}`}>
                {/* Header with gradient background */}
                <div className={`${colors.bg} border-b border-gray-100/50 relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent" />
                    <CardHeader className="p-6 relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <BookOpen className={`h-5 w-5 ${colors.text}`} />
                            <span className={`text-sm font-medium ${colors.text} bg-white/70 px-2 py-1 rounded-full`}>
                                {book.toplam_sayfa} sayfa
                            </span>
                        </div>
                        <CardTitle className="text-xl font-bold text-slate-800 leading-tight line-clamp-3 min-h-[4.5rem]">
                            <Highlight text={book.kitap_adi} query={searchTerm} />
                        </CardTitle>
                </CardHeader>
                </div>

                {/* Content Area */}
                <CardContent className="flex-grow p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 bg-gradient-to-b from-emerald-400/80 to-emerald-500/80 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-slate-700">Eser Bilgileri</h3>
                    </div>
                    <div className="bg-emerald-50/40 p-4 rounded-lg border border-emerald-100/50">
                        <p className="text-slate-600 text-sm leading-relaxed">
                            📖 {book.toplam_sayfa} sayfalık değerli bir eser
                        </p>
                        <p className="text-emerald-600/80 text-xs mt-2">
                            Okumaya başlamak için aşağıdaki butona tıklayın
                        </p>
                    </div>
                </CardContent>

                {/* Footer */}
                <CardFooter className="p-6 pt-0">
                    <Button 
                        onClick={onReadClick} 
                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-3 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                    >
                        <BookOpen className="mr-2 h-5 w-5"/>
                        Okumaya Başla
                    </Button>
                </CardFooter>
            </Card>
        </motion.div>
    )
}

function LibrarySkeleton() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/30 via-teal-50/20 to-green-50/30">
            <div className="container mx-auto px-4 py-12">
                {/* Header Skeleton */}
                <div className="text-center mb-16">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="w-2 h-12 bg-emerald-200 rounded-full animate-pulse"></div>
                        <div className="h-16 bg-gradient-to-r from-emerald-200 to-teal-200 rounded-lg w-96 animate-pulse"></div>
                        <div className="w-2 h-12 bg-teal-200 rounded-full animate-pulse"></div>
                    </div>
                    <div className="h-6 bg-slate-200 rounded-md w-80 mx-auto mb-4 animate-pulse"></div>
                    <div className="h-5 bg-emerald-200 rounded-md w-40 mx-auto animate-pulse"></div>
                </div>

                {/* Filter Skeleton */}
                <div className="max-w-4xl mx-auto mb-16">
                    <div className="bg-white/90 rounded-2xl border border-emerald-200/50 overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-50/60 to-teal-50/40 p-6 border-b border-emerald-100/50">
                            <div className="h-6 bg-emerald-200 rounded-md w-48 mb-2 animate-pulse"></div>
                            <div className="h-4 bg-slate-200 rounded-md w-72 animate-pulse"></div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="h-4 bg-slate-200 rounded w-24 animate-pulse"></div>
                                    <div className="h-12 bg-emerald-100 rounded-lg animate-pulse"></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-4 bg-slate-200 rounded w-24 animate-pulse"></div>
                                    <div className="h-12 bg-emerald-100 rounded-lg animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Books Skeleton */}
                <div className="space-y-16">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="w-2 h-12 bg-gradient-to-b from-emerald-300 to-teal-400 rounded-full animate-pulse"></div>
                                <div>
                                    <div className="h-8 bg-emerald-200 rounded-lg w-48 mb-2 animate-pulse"></div>
                                    <div className="h-5 bg-slate-200 rounded w-24 animate-pulse"></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {[...Array(4)].map((_, j) => (
                                    <div key={j} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 border-b border-gray-100">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-5 h-5 bg-emerald-300 rounded animate-pulse"></div>
                                                <div className="h-6 bg-emerald-200 rounded-full w-20 animate-pulse"></div>
                                            </div>
                                            <div className="h-6 bg-slate-300 rounded w-full mb-2 animate-pulse"></div>
                                            <div className="h-6 bg-slate-200 rounded w-3/4 animate-pulse"></div>
                                        </div>
                                        <div className="p-6 space-y-4">
                                            <div className="h-4 bg-slate-200 rounded w-32 animate-pulse"></div>
                                            <div className="h-16 bg-emerald-100 rounded-lg animate-pulse"></div>
                                            <div className="h-12 bg-emerald-200 rounded-lg animate-pulse"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Loading Indicator */}
                <div className="text-center mt-12">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                    <p className="text-slate-600 font-medium">Kütüphane yükleniyor...</p>
                </div>
            </div>
        </div>
    )
}

function EmptyState() {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center py-24 px-8 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 rounded-3xl max-w-2xl mx-auto border border-emerald-200/50 shadow-xl backdrop-blur-sm relative overflow-hidden"
        >
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute top-10 left-10 w-20 h-20 bg-emerald-400 rounded-full animate-pulse" />
                <div className="absolute bottom-10 right-10 w-16 h-16 bg-teal-400 rounded-full animate-pulse" style={{animationDelay: '1s'}} />
                <div className="absolute top-1/2 left-1/4 w-12 h-12 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '2s'}} />
            </div>
            
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                className="relative z-10"
            >
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-emerald-200 to-teal-300 rounded-full flex items-center justify-center shadow-lg">
                    <Library className="h-12 w-12 text-emerald-600" />
                </div>
            </motion.div>
            
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="relative z-10"
            >
                <h3 className="text-3xl font-bold text-slate-800 mb-4 bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
                    Eser Bulunamadı
                </h3>
                <p className="text-lg text-slate-600 leading-relaxed max-w-lg mx-auto mb-6">
                    Arama kriterlerinize veya seçtiğiniz filtreye uyan bir eser bulunamadı. 
                    Lütfen farklı bir arama yapmayı deneyin.
                </p>
                
                <div className="flex items-center justify-center gap-4 text-sm text-emerald-600">
                    <div className="flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        <span>Farklı kelimeler deneyin</span>
                    </div>
                    <div className="w-px h-4 bg-emerald-300"></div>
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span>Filtreleri değiştirin</span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
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
        // Deduplicate books by kitap_adi and pdf_dosyasi
        return libraryData.map(authorData => {
            if (selectedAuthor !== "all" && authorData.yazar !== selectedAuthor) return null;
            // Remove duplicate books for each author
            const seen = new Set();
            const filteredBooks = authorData.kitaplar.filter(book => {
                const key = `${book.kitap_adi}-${book.pdf_dosyasi}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return book.kitap_adi.toLowerCase().includes(searchTerm.toLowerCase());
            });
            if (filteredBooks.length === 0) return null;
            return { ...authorData, kitaplar: filteredBooks };
        }).filter(Boolean);
    }, [libraryData, selectedAuthor, searchTerm]);

    const handleReadClick = (book) => { setSelectedBook(book); setIsModalOpen(true); };
    
    if (isLoading) return <LibrarySkeleton />;

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/30 via-teal-50/20 to-green-50/30">
            <div className="container mx-auto px-4 py-12 md:py-20">
                {/* Header */}
                <motion.header 
                    initial={{ opacity: 0, y: -20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.5 }} 
                    className="text-center mb-10"
                >
                    <h1 className="text-4xl md:text-5xl font-bold text-[#177267]">
                        Eserler Kütüphanesi
                    </h1>
                    <p className="mt-3 text-base md:text-lg text-slate-600">Mübareklerin tüm eserlerine göz atın, filtreleyin ve okumaya başlayın</p>
                </motion.header>

                {/* Simple filter (non-sticky) */}
                <div className="max-w-4xl mx-auto mb-10">
                    <div className="w-full bg-white border border-slate-200 rounded-xl p-4">
                        <div className="flex flex-col md:flex-row gap-3 md:items-center">
                            {/* Author */}
                            <div className="min-w-[240px]">
                                <Select value={selectedAuthor} onValueChange={setSelectedAuthor}>
                                    <SelectTrigger className="w-full h-11 text-base border-slate-300 focus:border-[#177267] focus:ring-0">
                                        <SelectValue placeholder="Yazar seçin..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tüm Yazarlar</SelectItem>
                                        {libraryData.map(authorData => (
                                            <SelectItem key={authorData.yazar} value={authorData.yazar}>{authorData.yazar}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Search */}
                            <div className="relative w-full">
                                <Input
                                    placeholder="Kitap adı veya yazar ile ara..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full h-11 pl-4 border-slate-300 focus:border-[#177267] focus:ring-0"
                                />
                            </div>
                        </div>
                        {/* Suggestions */}
                        <div className="flex flex-wrap gap-2 mt-3">
                            {["Sohbetler", "Mektubat", "Divan", "Musahabe", "Seyr-i Süluk"].map((label) => (
                                <button key={label} onClick={() => setSearchTerm(label)} className="px-3 py-1.5 text-sm rounded-full border border-slate-300 text-[#177267] hover:bg-slate-50">
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="space-y-20">
                    <AnimatePresence>
                        {filteredData.length > 0 ? (
                            filteredData.map((authorData, index) => {
                                const colors = getAuthorColors(authorData.yazar);
                                return (
                                <motion.section 
                                    key={authorData.yazar} 
                                    initial={{ opacity: 0, y: 30 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    className="relative"
                                >
                                    {/* Author Header */}
                                    <div className="mb-12">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className={`w-2 h-12 bg-gradient-to-b from-${colors.accent}-400 to-${colors.accent}-600 rounded-full`}></div>
                                            <div>
                                                <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">
                                                    {authorData.yazar}
                                                </h2>
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <BookOpen className={`h-5 w-5 text-${colors.accent}-600`} />
                                                    <span className={`text-${colors.accent}-600 font-semibold`}>
                                                        {authorData.kitaplar.length}
                                                    </span>
                                                    <span>eser</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`h-1 bg-gradient-to-r from-${colors.accent}-400/60 via-${colors.accent}-500/80 to-transparent rounded-full max-w-md`}></div>
                                    </div>

                                    {/* Books Grid */}
                                    <motion.div 
                                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8"
                                        initial="hidden"
                                        animate="visible"
                                        variants={{
                                            visible: {
                                                transition: {
                                                    staggerChildren: 0.08
                                                }
                                            }
                                        }}
                                    >
                                        {authorData.kitaplar.map((book, idx) => (
                                            <BookCard 
                                                key={`${book.pdf_dosyasi || book.kitap_adi}-${idx}`} 
                                                book={book} 
                                                onReadClick={() => handleReadClick(book)} 
                                                searchTerm={searchTerm} 
                                                colors={colors} 
                                            />
                                        ))}
                                    </motion.div>
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