// ai/frontend/src/app/kitaplar/page.js

"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Download, ArrowLeft, ArrowRight, BookOpen, Search, Library, AlertTriangle } from "lucide-react";

// ShadCN UI ve Yerel Bileşenler
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// --- YENİ: Debounce Hook'u ---
// Arama girdisi gibi sık değişen değerler için kullanılır.
// İşlemi yalnızca kullanıcı yazmayı bıraktığında tetikler.
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Her değer değişikliğinde önceki zamanlayıcıyı temizle
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}


// --- ALT BİLEŞENLER (TÜM DÜZELTMELERLE) ---

function BookViewerDialog({ book, onClose, isOpen }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false); // --- YENİ: Resim yükleme hatası state'i

  useEffect(() => {
    if (book) {
      setCurrentPage(1); 
      setTotalPages(book.toplam_sayfa || null);
      setIsLoading(true);
      setImageError(false); // --- YENİ: Dialog açıldığında hatayı sıfırla
    }
  }, [book]);

  useEffect(() => {
    setIsLoading(true);
    setImageError(false);
  }, [currentPage]);

  if (!book) return null;

  const imageUrl = `${API_BASE_URL}/pdf/page_image?pdf_file=${book.pdf_dosyasi}&page_num=${currentPage}`;
  
  // --- DÜZENLENDİ: İndirme fonksiyonu eklendi ---
  const handleDownload = () => {
    // Not: Bu fonksiyonun çalışması için API'nizin
    // doğrudan bir dosya yolu veya indirme linki sağlaması gerekir.
    // Örnek olarak dosyanın public olduğu varsayılmıştır.
    const downloadUrl = `${API_BASE_URL}/pdfs/${book.pdf_dosyasi}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `${book.kitap_adi}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[95vw] h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b"><DialogTitle className="text-xl md:text-2xl text-slate-800">{book.kitap_adi}</DialogTitle></DialogHeader>
        <div className="flex-grow flex justify-center items-center bg-slate-200 overflow-hidden relative">
          {isLoading && <Loader2 className="h-10 w-10 animate-spin text-slate-500 absolute" />}
          
          {/* --- DÜZENLENDİ: Hata durumu eklendi --- */}
          {imageError ? (
            <div className="text-center text-red-600">
                <AlertTriangle className="mx-auto h-12 w-12 mb-2" />
                <p>Sayfa resmi yüklenemedi.</p>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={imageUrl} 
              alt={`Sayfa ${currentPage}`} 
              onLoad={() => setIsLoading(false)} 
              onError={() => { setIsLoading(false); setImageError(true); }} // --- YENİ: Hata yakalama
              className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${isLoading || imageError ? 'opacity-0' : 'opacity-100'}`} 
            />
          )}
        </div>
        <DialogFooter className="flex-row justify-between items-center p-3 bg-slate-100 border-t">
          <Button variant="outline" onClick={handleDownload} aria-label="Kitabı İndir">
              <Download className="mr-0 md:mr-2 h-4 w-4" />
              <span className="hidden md:inline">İndir</span>
          </Button>
          <div className="flex items-center gap-2">
            <Button onClick={() => setCurrentPage(p => p > 1 ? p - 1 : 1)} disabled={currentPage <= 1} aria-label="Önceki Sayfa"><ArrowLeft className="h-4 w-4" /></Button>
            <Input type="number" value={currentPage} onChange={(e) => { const val = Number(e.target.value); if (val > 0 && val <= totalPages) setCurrentPage(val); }} className="w-20 text-center font-bold" />
            <span className="font-semibold text-slate-600">/ {totalPages || '...'}</span>
            <Button onClick={() => setCurrentPage(p => totalPages && p < totalPages ? p + 1 : p)} disabled={!totalPages || currentPage >= totalPages} aria-label="Sonraki Sayfa"><ArrowRight className="h-4 w-4" /></Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Highlight({ text, query }) {
    if (!query || !text) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (<span>{parts.map((part, i) => part.toLowerCase() === query.toLowerCase() ? (<mark key={i} className="bg-lime-200 text-lime-900 px-1 rounded-sm">{part}</mark>) : (part))}</span>);
}

function BookCard({ book, onReadClick, searchTerm }) {
    return (
        <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="flex flex-col h-full">
            <Card className="flex flex-col h-full overflow-hidden bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-xl border group">
                <CardHeader className="p-6">
                    <BookOpen className="h-10 w-10 text-emerald-500 mb-4 transition-transform group-hover:scale-110" />
                    <CardTitle className="text-xl font-bold text-slate-800 leading-snug h-16"><Highlight text={book.kitap_adi} query={searchTerm} /></CardTitle>
                </CardHeader>
                <CardContent className="flex-grow" />
                <CardFooter className="bg-slate-50/70 p-4 flex flex-col items-start gap-4">
                     <p className="text-sm text-slate-500">{book.toplam_sayfa} sayfa</p>
                    <Button onClick={onReadClick} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">Okumaya Başla</Button>
                </CardFooter>
            </Card>
        </motion.div>
    )
}

function LibrarySkeleton() {
    return (
        <div className="container mx-auto px-4 py-12">
             <div className="text-center mb-16"><div className="h-12 bg-slate-200 rounded-lg w-2/3 mx-auto animate-pulse"></div><div className="h-6 bg-slate-200 rounded-md w-1/2 mx-auto mt-6 animate-pulse"></div></div>
            <div className="h-16 bg-slate-200 rounded-xl w-full mb-12 animate-pulse"></div>
            <div className="space-y-16"><div className="h-10 bg-slate-300 rounded-md w-1/4 mb-8 animate-pulse"></div><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">{[...Array(4)].map((_, j) => (<div key={j} className="bg-slate-200 h-64 rounded-xl animate-pulse"></div>))}</div></div>
        </div>
    )
}

function EmptyState() {
    return (<div className="text-center py-16 px-6 bg-slate-100/80 rounded-2xl mt-12"><Library className="mx-auto h-16 w-16 text-slate-400 mb-4" /><h3 className="text-2xl font-bold text-slate-700">Sonuç Bulunamadı</h3><p className="text-slate-500 mt-2">Filtre kriterlerinize uyan bir kitap bulunamadı.</p></div>)
}

// --- YENİ: Hata durumu için component ---
function ErrorState({ message, onRetry }) {
    return (
        <div className="container mx-auto px-4 py-20 text-center">
            <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-3xl font-bold text-slate-800">Bir Sorun Oluştu</h2>
            <p className="text-slate-600 mt-2 mb-6">{message}</p>
            <Button onClick={onRetry}>Tekrar Dene</Button>
        </div>
    );
}


// --- KÜTÜPHANE SAYFASI (TÜM DÜZELTMELERLE) ---
export default function LibraryPage() {
    const [libraryData, setLibraryData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null); // --- YENİ: Hata yönetimi state'i
    const [selectedBook, setSelectedBook] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAuthor, setSelectedAuthor] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    
    // --- YENİ: Debounced arama terimi ---
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const fetchLibrary = async () => {
        setIsLoading(true);
        setError(null); // Denemeden önce hatayı sıfırla
        try {
            const response = await fetch(`${API_BASE_URL}/books_by_author`);
            if (!response.ok) throw new Error("Veri sunucudan alınamadı. Lütfen daha sonra tekrar deneyin.");
            const data = await response.json();
            setLibraryData(data.kutuphane || []);
        } catch (error) { 
            console.error("Kütüphane verisi alınırken hata:", error); 
            setError(error.message);
        } 
        finally { setIsLoading(false); }
    }

    useEffect(() => {
        fetchLibrary();
    }, []);

    // --- DÜZENLENDİ: Filtreleme mantığı debounced terimi kullanıyor ---
    const filteredData = useMemo(() => {
        return libraryData.map(authorData => {
            if (selectedAuthor !== "all" && authorData.yazar !== selectedAuthor) return null;
            
            const filteredBooks = authorData.kitaplar.filter(book => 
                book.kitap_adi.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
            );

            if (filteredBooks.length === 0) return null;
            return { ...authorData, kitaplar: filteredBooks };
        }).filter(Boolean);
    }, [libraryData, selectedAuthor, debouncedSearchTerm]); // dependency array güncellendi

    const handleAuthorChange = (author) => {
        setSelectedAuthor(author);
        if (author !== "all") {
            setTimeout(() => {
                const element = document.getElementById(author);
                if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    };

    const handleReadClick = (book) => { setSelectedBook(book); setIsModalOpen(true); };
    
    if (isLoading) return <LibrarySkeleton />;
    
    // --- YENİ: Hata durumu render'ı ---
    if (error) return <ErrorState message={error} onRetry={fetchLibrary} />;

    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="container mx-auto px-4 py-12 md:py-20">
                <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-12">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-slate-800">Kitap Kütüphanesi</h1>
                    <p className="mt-4 text-lg md:text-xl text-slate-600">Tüm eserlere göz atın, filtreleyin ve okumaya başlayın.</p>
                </motion.header>

                <div className="sticky top-24 z-40 bg-slate-50/80 backdrop-blur-lg p-4 mb-12 rounded-2xl border shadow-md shadow-slate-200/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select value={selectedAuthor} onValueChange={handleAuthorChange}>
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
                </div>

                <div className="space-y-16">
                    <AnimatePresence>
                        {filteredData.length > 0 ? (
                            filteredData.map((authorData, index) => (
                                <motion.section id={authorData.yazar} key={authorData.yazar} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }}>
                                    <h2 className="text-3xl md:text-4xl font-bold text-slate-700 mb-8 pb-3 border-b-4 border-emerald-500 inline-block scroll-mt-48">{authorData.yazar}</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                                        {authorData.kitaplar.map(book => (<BookCard key={book.kitap_adi} book={book} onReadClick={() => handleReadClick(book)} searchTerm={debouncedSearchTerm} />))}
                                    </div>
                                </motion.section>
                            ))
                        ) : ( <EmptyState /> )}
                    </AnimatePresence>
                </div>
                
                {selectedBook && <BookViewerDialog book={selectedBook} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
            </div>
        </div>
    );
}