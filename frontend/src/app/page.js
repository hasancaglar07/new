"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Loader2, Search, BookOpen, Video, ArrowRight, ArrowLeft, FileQuestion, ServerCrash, X, Sparkles, ZoomIn, ZoomOut, RotateCcw, Download, BotMessageSquare, Newspaper, User, Clock, Library, Music, Trash2, Play, ListMusic, List, ExternalLink, Eye, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NamazWidget from "@/components/NamazWidget";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useAudio } from "@/components/audio/AudioProvider";
import ChapterNavigationModal from "@/components/ChapterNavigationModal";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
// --- YARDIMCI FONKSİYONLAR VE BİLEŞENLER ---
function TapButton({ children, className, ...props }) {
  return (
    <Button className={className} {...props} asChild>
      <motion.button whileTap={{ scale: 0.95 }}>{children}</motion.button>
    </Button>
  );
}
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareMenuPosition, setShareMenuPosition] = useState({ x: 0, y: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const [showSelectionBox, setShowSelectionBox] = useState(false);

  useEffect(() => {
    if (book && isOpen) {
      const pageNumber = parseInt(book.sayfa, 10);
      setCurrentPage(pageNumber);
      setIsLoading(true);
      
      // PDF bilgilerini API'den al
      if (book.pdf_dosyasi) {
        fetch(`${API_BASE_URL}/pdf/info?pdf_file=${encodeURIComponent(book.pdf_dosyasi)}`)
          .then(res => res.ok ? res.json() : Promise.reject('Sayfa bilgisi alınamadı'))
          .then(data => {
            setTotalPages(data.total_pages);
            setIsLoading(false);
          })
          .catch(() => {
            setTotalPages(book.toplam_sayfa || 1);
            setIsLoading(false);
          });
      } else {
        setTotalPages(book.toplam_sayfa || 1);
        setIsLoading(false);
      }
    }
  }, [book, isOpen]);

  const imageUrl = useMemo(() => {
    if (!book) return null;
    return `${API_BASE_URL}/pdf/page_image?pdf_file=${book.pdf_dosyasi}&page_num=${currentPage}`;
  }, [book, currentPage]);

  const pdfUrl = useMemo(() => {
    if (!book) return null;
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

  // Resim üzerinde alan seçimi için event listener'lar
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e) => {
      console.log('Mouse down event:', e.target.tagName, e.target.className);
      const target = e.target;
      if (target.tagName === 'IMG' || target.closest('.pdf-image-container')) {
        console.log('Starting selection...');
        setIsSelecting(true);
        setShowSelectionBox(true);
        const rect = target.getBoundingClientRect();
        const startPos = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        console.log('Selection start:', startPos);
        setSelectionStart(startPos);
        setSelectionEnd(startPos);
        e.preventDefault();
      }
    };

    const handleMouseMove = (e) => {
      if (!isSelecting) return;
      const target = document.querySelector('.pdf-image-container img');
      if (target) {
        const rect = target.getBoundingClientRect();
        setSelectionEnd({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    };

    const handleMouseUp = (e) => {
      console.log('Mouse up event, isSelecting:', isSelecting);
      if (isSelecting) {
        setIsSelecting(false);
        const width = Math.abs(selectionEnd.x - selectionStart.x);
        const height = Math.abs(selectionEnd.y - selectionStart.y);
        console.log('Selection size:', width, 'x', height);
        
        if (width > 20 && height > 20) {
          const selectedText = `Seçilen alan: ${Math.round(width)}x${Math.round(height)} piksel`;
          console.log('Showing share menu with text:', selectedText);
          setSelectedText(selectedText);
          setShareMenuPosition({
            x: e.clientX,
            y: e.clientY - 60
          });
          setShowShareMenu(true);
        } else {
          console.log('Selection too small, hiding box');
          setShowSelectionBox(false);
        }
      }
    };

    const handleClickOutside = (e) => {
      if (!e.target.closest('.share-menu')) {
        setShowShareMenu(false);
        setSelectedText('');
        setShowSelectionBox(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, isSelecting, selectionStart, selectionEnd]);

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

  // Seçilen alanı resim olarak crop etme ve bilgi overlay'i ekleme fonksiyonu
  const cropSelectedArea = async () => {
    try {
      const img = document.querySelector('.pdf-image-container img');
      if (!img) return null;
      
      // Resmin gerçek boyutlarını al
      const imgRect = img.getBoundingClientRect();
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      const displayWidth = imgRect.width;
      const displayHeight = imgRect.height;
      
      // Ölçekleme oranlarını hesapla
      const scaleX = naturalWidth / displayWidth;
      const scaleY = naturalHeight / displayHeight;
      
      // Seçim koordinatlarını gerçek resim boyutlarına çevir
      const x = Math.min(selectionStart.x, selectionEnd.x) * scaleX;
      const y = Math.min(selectionStart.y, selectionEnd.y) * scaleY;
      const width = Math.abs(selectionEnd.x - selectionStart.x) * scaleX;
      const height = Math.abs(selectionEnd.y - selectionStart.y) * scaleY;
      
      // Canvas boyutlarını ayarla (crop + info alanı)
      const infoHeight = 120; // Alt bilgi alanı yüksekliği
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = width;
      canvas.height = height + infoHeight;
      
      // Crop edilmiş resmi çiz
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
      
      // Alt bilgi alanını çiz
      const gradient = ctx.createLinearGradient(0, height, 0, height + infoHeight);
      gradient.addColorStop(0, '#1f2937');
      gradient.addColorStop(1, '#111827');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, height, width, infoHeight);
      
      // Kitap bilgilerini ekle
      const bookTitle = book?.kitap_adi || book?.kitap || 'Kitap';
      // Yazar adını farklı alanlardan bulmaya çalış
      const authorName = book?.yazar || book?.author || book?.yazarAdi || book?.authorName || 
                        (book?.pdf_dosyasi ? book.pdf_dosyasi.split('-').slice(1).join('-').replace('.pdf', '').replace(/_/g, ' ') : 'Bilinmeyen Yazar');
      
      // Gerçek sayfa linki oluştur
      const pageUrl = `mihmandar.org/kitaplar/${book?.id || 'kitap'}?sayfa=${currentPage}`;
      
      // Başlık
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'left';
      const titleText = bookTitle.length > 35 ? bookTitle.substring(0, 32) + '...' : bookTitle;
      ctx.fillText(titleText, 15, height + 20);
      
      // Yazar
      ctx.fillStyle = '#d1d5db';
      ctx.font = '14px Arial';
      const displayAuthor = authorName.length > 45 ? authorName.substring(0, 42) + '...' : authorName;
      ctx.fillText(`✍️ ${displayAuthor}`, 15, height + 40);
      
      // Sayfa
      ctx.fillText(`📖 Sayfa ${currentPage}`, 15, height + 58);
      
      // Link
      ctx.fillStyle = '#60a5fa';
      ctx.font = '12px Arial';
      ctx.fillText(`🔗 ${pageUrl}`, 15, height + 76);
      
      // Logo/Site adı
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('📚 Mihmandar.org', width - 15, height + 95);
      
      // Alt yazı
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px Arial';
      ctx.fillText('E-Kütüphanesi', width - 15, height + 108);
      
      // Canvas'ı blob'a çevir
      return new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png', 0.9);
      });
    } catch (error) {
      console.error('Crop error:', error);
      return null;
    }
  };

  // Sosyal medya paylaşım fonksiyonları
  const shareOnWhatsApp = async (text) => {
    console.log('WhatsApp share clicked with text:', text);
    const bookTitle = book?.kitap_adi || book?.kitap || 'Kitap';
    // Yazar adını farklı alanlardan bulmaya çalış
    const authorName = book?.yazar || book?.author || book?.yazarAdi || book?.authorName || 
                      (book?.pdf_dosyasi ? book.pdf_dosyasi.split('-').slice(1).join('-').replace('.pdf', '').replace(/_/g, ' ') : 'Bilinmeyen Yazar');
    
    // Gerçek sayfa linki oluştur
    const pageUrl = `mihmandar.org/kitaplar/${book?.id || 'kitap'}?sayfa=${currentPage}`;
    
    // Seçilen alanı crop et
    const croppedImage = await cropSelectedArea();
    
    // Ayrı paylaşım: 1 resim + 1 text + 1 link
       const shareText = `📚 *${bookTitle}*\n\n✍️ Yazar: ${authorName}\n📖 Sayfa: ${currentPage}\n\n💎 Bu değerli kitaptan özel bir bölüm seçtim ve paylaşıyorum!\n\n🔗 Bu sayfayı okumak için:\n${pageUrl}\n\n📚 Tüm kütüphaneyi keşfetmek için:\nmihmandar.org\n\n#MihmandarOrg #EKütüphane #Kitap #İlim #Maneviyat #Tasavvuf`;
       
       console.log('Share text prepared:', shareText);
       console.log('Navigator.share available:', !!navigator.share);
       console.log('Cropped image available:', !!croppedImage);
       
       if (croppedImage && navigator.share && navigator.canShare && navigator.canShare({ files: [new File([croppedImage], 'test.png', { type: 'image/png' })] })) {
         // 1. Önce sadece resim paylaş (text olmadan)
         try {
           console.log('Attempting native share...');
           const file = new File([croppedImage], `${bookTitle.replace(/[^a-zA-Z0-9]/g, '_')}_sayfa_${currentPage}.png`, { type: 'image/png' });
           await navigator.share({
             title: `📚 ${bookTitle} - Mihmandar.org E-Kütüphanesi`,
             files: [file]
           });
           
           console.log('Native share successful, scheduling text share...');
           // 2. Sonra ayrı mesaj olarak text + link paylaş
           setTimeout(() => {
             console.log('Opening WhatsApp for text share...');
             const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
             window.open(url, '_blank');
           }, 1500);
           
         } catch (shareError) {
           console.log('Native share failed, falling back to text:', shareError);
           // Fallback: Text paylaşımı
           const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
           window.open(url, '_blank');
         }
       } else {
         // Fallback: Text paylaşımı
         console.log('Using fallback text share. Reasons:');
         console.log('- Cropped image:', !!croppedImage);
         console.log('- Navigator.share:', !!navigator.share);
         console.log('- Navigator.canShare:', !!navigator.canShare);
         const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
         console.log('Opening WhatsApp URL:', url);
         window.open(url, '_blank');
       }
    
    setShowShareMenu(false);
    setShowSelectionBox(false);
  };

  const shareOnFacebook = async (text) => {
    const bookTitle = book?.kitap_adi || book?.kitap || 'Kitap';
    // Yazar adını farklı alanlardan bulmaya çalış
    const authorName = book?.yazar || book?.author || book?.yazarAdi || book?.authorName || 
                      (book?.pdf_dosyasi ? book.pdf_dosyasi.split('-').slice(1).join('-').replace('.pdf', '').replace(/_/g, ' ') : 'Bilinmeyen Yazar');
    
    // Gerçek sayfa linki oluştur
    const pageUrl = `mihmandar.org/kitaplar/${book?.id || 'kitap'}?sayfa=${currentPage}`;
    
    // Seçilen alanı crop et
    const croppedImage = await cropSelectedArea();
    
    if (croppedImage && navigator.share) {
      try {
        const file = new File([croppedImage], `${bookTitle.replace(/[^a-zA-Z0-9]/g, '_')}_sayfa_${currentPage}.png`, { type: 'image/png' });
        await navigator.share({
          title: `📚 ${bookTitle} - Mihmandar.org E-Kütüphanesi`,
          text: `📚 ${bookTitle}\n\n✍️ Yazar: ${authorName}\n📖 Sayfa: ${currentPage}\n\n🌟 Bu değerli eserden özel bir bölüm paylaşıyorum. İlim ve maneviyat dolu bu kitabı Mihmandar.org E-Kütüphanesi'nde okuyabilirsiniz.\n\n🔗 Bu sayfayı okumak için:\n${pageUrl}\n\n📚 Tüm kütüphaneyi keşfetmek için:\nmihmandar.org\n\n#MihmandarOrg #EKütüphane #Kitap #İlim #Maneviyat #Tasavvuf #Eğitim #Bilgi`,
          files: [file]
        });
      } catch (shareError) {
        // Fallback: Text paylaşımı
        const shareText = `📚 ${bookTitle}\n\n✍️ Yazar: ${authorName}\n📖 Sayfa: ${currentPage}\n\n🌟 Bu değerli eserden özel bir bölüm paylaşıyorum. İlim ve maneviyat dolu bu kitabı Mihmandar.org E-Kütüphanesi'nde okuyabilirsiniz.\n\n🔗 Bu sayfayı okumak için:\n${pageUrl}\n\n📚 Tüm kütüphaneyi keşfetmek için:\nmihmandar.org\n\n#MihmandarOrg #EKütüphane #Kitap #İlim #Maneviyat #Tasavvuf #Eğitim #Bilgi`;
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://mihmandar.org')}&quote=${encodeURIComponent(shareText)}`;
        window.open(url, '_blank');
      }
    } else {
      const shareText = `📚 ${bookTitle}\n\n✍️ Yazar: ${authorName}\n📖 Sayfa: ${currentPage}\n\n🌟 Bu değerli eserden özel bir bölüm paylaşıyorum. İlim ve maneviyat dolu bu kitabı Mihmandar.org E-Kütüphanesi'nde okuyabilirsiniz.\n\n🔗 Bu sayfayı okumak için:\n${pageUrl}\n\n📚 Tüm kütüphaneyi keşfetmek için:\nmihmandar.org\n\n#MihmandarOrg #EKütüphane #Kitap #İlim #Maneviyat #Tasavvuf #Eğitim #Bilgi`;
      const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://mihmandar.org')}&quote=${encodeURIComponent(shareText)}`;
      window.open(url, '_blank');
    }
    setShowShareMenu(false);
    setShowSelectionBox(false);
  };

  const shareOnTwitter = async (text) => {
    const bookTitle = book?.kitap_adi || book?.kitap || 'Kitap';
    // Yazar adını farklı alanlardan bulmaya çalış
    const authorName = book?.yazar || book?.author || book?.yazarAdi || book?.authorName || 
                      (book?.pdf_dosyasi ? book.pdf_dosyasi.split('-').slice(1).join('-').replace('.pdf', '').replace(/_/g, ' ') : 'Bilinmeyen Yazar');
    
    // Gerçek sayfa linki oluştur
    const pageUrl = `mihmandar.org/kitaplar/${book?.id || 'kitap'}?sayfa=${currentPage}`;
    
    // Seçilen alanı crop et
    const croppedImage = await cropSelectedArea();
    
    if (croppedImage && navigator.share) {
      try {
        const file = new File([croppedImage], `${bookTitle.replace(/[^a-zA-Z0-9]/g, '_')}_sayfa_${currentPage}.png`, { type: 'image/png' });
        await navigator.share({
          title: `📚 ${bookTitle} | Mihmandar.org E-Kütüphanesi`,
          text: `📚 "${bookTitle}" - ${authorName}\n📖 Sayfa ${currentPage}\n\n💎 Bu değerli eserden bir bölüm...\n\n🔗 ${pageUrl}\n\n📚 mihmandar.org\n\n#MihmandarOrg #EKütüphane #Kitap #İlim #Maneviyat #Tasavvuf #Bilgi #Hikmet`,
          files: [file]
        });
      } catch (shareError) {
        // Fallback: Text paylaşımı
        const shareText = `📚 "${bookTitle}" - ${authorName}\n📖 Sayfa ${currentPage}\n\n💎 Bu değerli eserden bir bölüm...\n\n🔗 ${pageUrl}\n\n📚 mihmandar.org\n\n#MihmandarOrg #EKütüphane #Kitap #İlim #Maneviyat #Tasavvuf #Bilgi #Hikmet`;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
        window.open(url, '_blank');
      }
    } else {
      const shareText = `📚 "${bookTitle}" - ${authorName}\n📖 Sayfa ${currentPage}\n\n💎 Bu değerli eserden bir bölüm...\n\n🔗 ${pageUrl}\n\n📚 mihmandar.org\n\n#MihmandarOrg #EKütüphane #Kitap #İlim #Maneviyat #Tasavvuf #Bilgi #Hikmet`;
      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
      window.open(url, '_blank');
    }
    setShowShareMenu(false);
    setShowSelectionBox(false);
  };

  if (!book) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-none w-screen h-screen p-0 gap-0 flex flex-col bg-slate-800">
        <DialogHeader className="p-3 border-b border-slate-700 flex-shrink-0 flex-row items-center justify-between text-white bg-slate-900/50">
          <DialogTitle className="text-lg md:text-xl text-slate-100 line-clamp-1">{book.kitap_adi || book.kitap}</DialogTitle>
          <Button aria-label="Kapat" variant="ghost" size="icon" onClick={onClose} className="text-slate-300 hover:text-white hover:bg-slate-700"><X className="h-6 w-6"/></Button>
        </DialogHeader>
        <div className="flex-grow w-full h-full flex justify-center items-center overflow-hidden relative">
          {isLoading && <Loader2 className="h-10 w-10 animate-spin text-slate-400 absolute z-10" />}
          {imageUrl && (
            <TransformWrapper 
              limitToBounds={true} 
              doubleClick={{ mode: 'reset', disabled: isSelecting }} 
              pinch={{ step: 1, disabled: isSelecting }} 
              wheel={{ step: 0.2 }}
              panning={{ disabled: isSelecting }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                   <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                    <Button aria-label="Yakınlaştır" onClick={() => zoomIn()} className="bg-slate-900/70 hover:bg-slate-800/90 text-white backdrop-blur-sm"><ZoomIn /></Button>
                    <Button aria-label="Uzaklaştır" onClick={() => zoomOut()} className="bg-slate-900/70 hover:bg-slate-800/90 text-white backdrop-blur-sm"><ZoomOut /></Button>
                    <Button aria-label="Görünümü sıfırla" onClick={() => resetTransform()} className="bg-slate-900/70 hover:bg-slate-800/90 text-white backdrop-blur-sm"><RotateCcw /></Button>
                    <div className="flex flex-col gap-2">
                      {pdfUrl && <Button aria-label="PDF'yi yeni sekmede aç" onClick={()=> window.open(pdfUrl, '_blank')} className="bg-slate-700 hover:bg-slate-600 text-white">PDF</Button>}
                    </div>
                  </div>
                  <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                    <div className="pdf-image-container relative w-full h-full">
                      <Image key={imageUrl} src={imageUrl} alt={`Sayfa ${currentPage}`} onLoad={() => setIsLoading(false)} onError={() => { setIsLoading(false); }} fill style={{ objectFit: 'contain' }} className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`} sizes="100vw"/>
                      
                      {/* Selection Box Overlay */}
                      {showSelectionBox && (
                        <div
                          className="absolute border-2 border-blue-500 bg-blue-200/20 pointer-events-none"
                          style={{
                            left: Math.min(selectionStart.x, selectionEnd.x),
                            top: Math.min(selectionStart.y, selectionEnd.y),
                            width: Math.abs(selectionEnd.x - selectionStart.x),
                            height: Math.abs(selectionEnd.y - selectionStart.y),
                          }}
                        />
                      )}
                    </div>
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
      
      {/* Floating Share Menu */}
      <AnimatePresence>
        {showShareMenu && selectedText && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="share-menu fixed z-[9999] bg-white rounded-lg shadow-2xl border border-slate-200 p-2 flex items-center gap-1"
            style={{
              left: Math.max(10, Math.min(shareMenuPosition.x - 75, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 160)),
              top: Math.max(10, shareMenuPosition.y),
              pointerEvents: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                shareOnWhatsApp(selectedText);
              }}
              className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors flex items-center justify-center"
              title="WhatsApp'ta Paylaş"
            >
              <span className="text-lg">📱</span>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                shareOnFacebook(selectedText);
              }}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex items-center justify-center"
              title="Facebook'ta Paylaş"
            >
              <span className="text-lg">👥</span>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                shareOnTwitter(selectedText);
              }}
              className="p-2 text-sky-600 hover:bg-sky-50 rounded-full transition-colors flex items-center justify-center"
              title="X'te Paylaş"
            >
              <span className="text-lg">🔗</span>
            </button>
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-slate-200 rotate-45"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
function ArticleViewerDialog({ articleId, onClose, isOpen }) {
  const [article, setArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isOpen && articleId) {
      setIsLoading(true);
      fetch(`${API_BASE_URL}/article/${articleId}`)
        .then(res => res.json())
        .then(data => { setArticle(data); setIsLoading(false); })
        .catch(() => setIsLoading(false));
    }
  }, [isOpen, articleId]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = () => {
      const el = document.getElementById('article-scroll-container');
      if (!el) return;
      const scrolled = el.scrollTop;
      const height = el.scrollHeight - el.clientHeight;
      const pct = Math.max(0, Math.min(100, (scrolled / Math.max(1, height)) * 100));
      setProgress(pct);
    };
    document.addEventListener('scroll', handler, true);
    return () => document.removeEventListener('scroll', handler, true);
  }, [isOpen]);

  const calcReadingMinutes = (html) => {
    if (!html) return 0;
    const text = html.replace(/<[^>]*>/g, ' ');
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 200));
  };

  const articleDate = article ? new Date(article.scraped_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const readMins = article ? calcReadingMinutes(article.content) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : !article ? (
          <div className="flex items-center justify-center h-full text-red-500">Makale yüklenemedi.</div>
        ) : (
          <>
            <DialogHeader className="p-6 pb-3">
              <DialogTitle className="text-3xl font-bold leading-tight">{article.title}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-sm">
                <span className="flex items-center gap-1.5"><User className="h-4 w-4" />{article.author}</span>
                <span className="flex items-center gap-1.5"><Library className="h-4 w-4" />{article.category}</span>
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{articleDate} • {readMins} dk okuma</span>
              </DialogDescription>
              <div className="mt-3"><Progress value={progress} /></div>
            </DialogHeader>
            <Separator />
            <div id="article-scroll-container" className="px-6 py-6 flex-grow overflow-y-auto">
              <article className="
                prose prose-lg max-w-none
                prose-headings:text-slate-800 prose-headings:font-bold prose-headings:tracking-tight
                prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-8 prose-h1:text-emerald-800
                prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-6 prose-h2:text-emerald-700 prose-h2:border-b prose-h2:border-emerald-200 prose-h2:pb-2
                prose-h3:text-xl prose-h3:mb-3 prose-h3:mt-5 prose-h3:text-emerald-600
                prose-h4:text-lg prose-h4:mb-2 prose-h4:mt-4 prose-h4:text-slate-700
                prose-p:text-slate-700 prose-p:leading-relaxed prose-p:mb-4 prose-p:text-base
                prose-a:text-emerald-600 prose-a:font-medium prose-a:no-underline hover:prose-a:text-emerald-700 hover:prose-a:underline
                prose-strong:text-slate-800 prose-strong:font-semibold prose-strong:bg-yellow-100 prose-strong:px-1 prose-strong:rounded
                prose-em:text-slate-600 prose-em:italic
                prose-blockquote:border-l-4 prose-blockquote:border-emerald-300 prose-blockquote:bg-emerald-50/70 prose-blockquote:pl-6 prose-blockquote:py-4 prose-blockquote:my-6 prose-blockquote:rounded-r-lg prose-blockquote:italic
                prose-ul:my-4 prose-ul:space-y-2 prose-ol:my-4 prose-ol:space-y-2 prose-li:text-slate-700 prose-li:leading-relaxed
                prose-code:text-emerald-700 prose-code:bg-emerald-50 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:font-mono prose-code:text-sm
                prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 prose-pre:rounded-lg prose-pre:p-4 prose-pre:my-4
                prose-hr:border-emerald-200 prose-hr:my-8
                prose-table:my-6 prose-thead:bg-emerald-50 prose-th:text-emerald-700 prose-th:font-semibold prose-th:p-3 prose-td:p-3
                prose-img:rounded-lg prose-img:shadow-md prose-img:my-4
              " style={{
                textAlign: 'justify',
                hyphens: 'auto'
              }}>
                <div dangerouslySetInnerHTML={{ __html: article.content }} />
              </article>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ArticleResultCard({ result, onReadClick, query, index }) {
    const cardVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.98 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                delay: index * 0.05,
                duration: 0.4,
                ease: "easeOut"
            }
        }
    };
    
    return (
        <motion.div variants={cardVariants} className="h-full">
            <Card className="flex flex-col h-full overflow-hidden bg-white hover:shadow-xl transition-all duration-300 group border border-slate-200/60 hover:border-slate-300/80 rounded-2xl hover:-translate-y-2">
                {/* Clean Header */}
                <div className="p-8 pb-6">
                    <div className="flex items-start justify-between mb-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Newspaper className="w-3 h-3 mr-1.5" />
                            {result.kategori}
                        </span>
                        <div className="text-xs text-slate-400 font-mono">
                            MAKALE
                        </div>
                    </div>
                    
                    <CardTitle className="text-xl font-bold text-slate-900 mb-3 line-clamp-2 leading-tight group-hover:text-slate-800 transition-colors">
                        <Highlight text={result.baslik} query={query} />
                    </CardTitle>
                    
                    <div className="flex items-center text-sm text-slate-600">
                        <User className="h-4 w-4 mr-2" />
                        <span className="font-medium">{result.yazar}</span>
                    </div>
                </div>
                
                {/* Content Preview */}
                <CardContent className="flex-grow px-8 pb-6">
                    <div className="relative">
                        <div className="absolute left-0 top-0 w-1 h-full bg-slate-200 rounded-full"></div>
                        <blockquote className="pl-6 text-slate-600 leading-relaxed line-clamp-3 italic">
                            &quot;<Highlight text={result.alinti} query={query} />&quot;
                        </blockquote>
                    </div>
                </CardContent>
                
                {/* Action Footer */}
                <CardFooter className="p-8 pt-0 mt-auto">
                    <TapButton
                        onClick={() => onReadClick(result.id)}
                        className="w-full bg-[#177267] hover:bg-[#116358] text-white font-medium py-3 rounded-xl transition-all duration-200 hover:shadow-lg"
                    >
                        Makaleyi Oku
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </TapButton>
                </CardFooter>
            </Card>
        </motion.div>
    );
}
function BookResultCard({ result, onReadClick, query, index }) {
    const cardVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.98 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                delay: index * 0.05,
                duration: 0.4,
                ease: "easeOut"
            }
        }
    };
    
    return (
        <motion.div variants={cardVariants} className="h-full">
            <Card className="flex flex-col h-full overflow-hidden bg-white hover:shadow-xl transition-all duration-300 group border border-slate-200/60 hover:border-slate-300/80 rounded-2xl hover:-translate-y-2">
                {/* Clean Header */}
                <div className="p-8 pb-6">
                    <div className="flex items-start justify-between mb-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <BookOpen className="w-3 h-3 mr-1.5" />
                            Sayfa {result.sayfa}
                        </span>
                        <div className="text-xs text-slate-400 font-mono">
                            KİTAP
                        </div>
                    </div>
                    
                    <CardTitle className="text-xl font-bold text-slate-900 mb-3 line-clamp-2 leading-tight group-hover:text-slate-800 transition-colors">
                        <Highlight text={result.kitap} query={query} />
                    </CardTitle>
                    
                    <div className="flex items-center text-sm text-slate-600">
                        <User className="h-4 w-4 mr-2" />
                        <span className="font-medium">{result.yazar}</span>
                    </div>
                </div>
                
                {/* Content Preview */}
                <CardContent className="flex-grow px-8 pb-6">
                    <div className="relative">
                        <div className="absolute left-0 top-0 w-1 h-full bg-emerald-200 rounded-full"></div>
                        <blockquote className="pl-6 text-slate-600 leading-relaxed line-clamp-3 italic">
                            &quot;<Highlight text={result.alinti} query={query} />&quot;
                        </blockquote>
                    </div>
                </CardContent>
                
                {/* Preview Section */}
                <div className="px-8 pb-6">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1" className="border-0">
                            <AccordionTrigger className="text-sm font-medium text-slate-700 hover:no-underline py-3 px-4 hover:bg-slate-50 rounded-lg transition-colors">
                                <div className="flex items-center gap-2">
                                    <ZoomIn className="h-4 w-4" />
                                    Sayfa Önizlemesi
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4">
                                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                                    <PagePreview pdfFile={result.pdf_dosyasi} pageNum={result.sayfa} />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
                
                {/* Action Footer */}
                <CardFooter className="p-8 pt-0 mt-auto">
                    <TapButton
                        onClick={() => onReadClick(result)}
                        className="w-full bg-[#177267] hover:bg-[#116358] text-white font-medium py-3 rounded-xl transition-all duration-200 hover:shadow-lg"
                    >
                        Bu Sayfayı Oku
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </TapButton>
                </CardFooter>
            </Card>
        </motion.div>
    );
}
function AudioResultCard({ result, query, index, onPlayClick }) {
    const cardVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.98 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                delay: index * 0.05,
                duration: 0.4,
                ease: "easeOut"
            }
        }
    };
    
    // Dosya adından temiz başlık çıkar
    const cleanTitle = result.title.replace(/\.(mp3|wav|m4a)$/i, '').replace(/_/g, ' ');
    
    return (
        <motion.div variants={cardVariants} className="h-full">
            <Card className="flex flex-col h-full overflow-hidden bg-white hover:shadow-xl transition-all duration-300 group border border-slate-200/60 hover:border-slate-300/80 rounded-2xl hover:-translate-y-2">
                {/* Clean Header */}
                <div className="p-8 pb-6">
                    <div className="flex items-start justify-between mb-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Music className="w-3 h-3 mr-1.5" />
                            {result.source}
                        </span>
                        <div className="text-xs text-slate-400 font-mono">
                            SES
                        </div>
                    </div>
                    
                    <CardTitle className="text-xl font-bold text-slate-900 mb-4 line-clamp-2 leading-tight group-hover:text-slate-800 transition-colors">
                        <Highlight text={cleanTitle} query={query} />
                    </CardTitle>
                </div>
                
                {/* Chapters Preview */}
                <CardContent className="flex-grow px-8 pb-6">
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-slate-700 mb-3">Konu Başlıkları</h4>
                        {result.matching_chapters.slice(0, 3).map((chapter, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200/50">
                                <span className="font-mono text-xs font-medium text-purple-600 bg-white px-2 py-1 rounded border border-purple-200 shrink-0">
                                    {chapter.time}
                                </span>
                                <span className="text-sm text-slate-700 line-clamp-2 leading-relaxed">
                                    <Highlight text={chapter.title} query={query} />
                                </span>
                            </div>
                        ))}
                        {result.matching_chapters.length > 3 && (
                            <div className="text-center py-2">
                                <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                    +{result.matching_chapters.length - 3} konu daha
                                </span>
                            </div>
                        )}
                    </div>
                </CardContent>
                
                {/* Action Footer */}
                <CardFooter className="p-8 pt-0 mt-auto">
                   <TapButton
                        onClick={() => onPlayClick(result)}
                        className="w-full bg-[#177267] hover:bg-[#116358] text-white font-medium py-3 rounded-xl transition-all duration-200 hover:shadow-lg"
                   >
                        <Play className="h-4 w-4 mr-2" />
                        Kaydı Dinle
                        <ArrowRight className="w-4 h-4 ml-2" />
                   </TapButton>
                </CardFooter>
            </Card>
        </motion.div>
    );
}
function VideoCard({ video, index }) {
    const cardVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.98 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                delay: index * 0.05,
                duration: 0.4,
                ease: "easeOut"
            }
        }
    };
    
    return (
        <motion.div variants={cardVariants} className="h-full flex">
            <Card className="w-full overflow-hidden bg-white hover:shadow-xl transition-all duration-300 border border-slate-200/60 hover:border-slate-300/80 rounded-2xl group flex flex-col h-full hover:-translate-y-2">
                {/* Video Embed */}
                <div className="aspect-video bg-slate-100 relative overflow-hidden">
                    <iframe
                        src={`https://www.youtube.com/embed/${video.id}`}
                        title={video.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-4 left-4">
                        <span className="bg-[#177267] text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1.5">
                            <Video className="h-3 w-3" />
                            Video
                        </span>
                    </div>
                </div>
                
                {/* Content */}
                <div className="flex flex-col flex-grow p-8">
                    <div className="flex items-start justify-between mb-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Video className="w-3 h-3 mr-1.5" />
                            Video
                        </span>
                        <div className="text-xs text-slate-400 font-mono">
                            YOUTUBE
                        </div>
                    </div>
                    
                    <CardTitle className="text-xl font-bold text-slate-900 mb-4 line-clamp-2 leading-tight group-hover:text-slate-800 transition-colors">
                        <Highlight text={video.title} query="" />
                    </CardTitle>
                    
                    <div className="flex items-center text-sm text-slate-600 mb-4">
                        <User className="h-4 w-4 mr-2" />
                        <span className="font-medium">{video.channel}</span>
                    </div>
                    
                    <div className="flex items-center text-xs text-slate-500 mb-6">
                        <Clock className="h-4 w-4 mr-2" />
                        {formatDate(video.publishedTime)}
                    </div>
                    
                    {/* Action Footer */}
                    <div className="mt-auto">
                        <Button asChild className="w-full bg-[#177267] hover:bg-[#116358] text-white font-medium py-3 rounded-xl transition-all duration-200 hover:shadow-lg">
                          <motion.a whileTap={{ scale: 0.95 }} href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="block">
                            YouTube&apos;da İzle
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </motion.a>
                        </Button>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}
function AnalysisCard({ analysis, query, index }) {
    const [showChapterModal, setShowChapterModal] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    
    const cardVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                delay: index * 0.05,
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94]
            }
        }
    };

    const hoverVariants = {
        rest: { scale: 1, y: 0 },
        hover: { 
            scale: 1.03, 
            y: -5,
            transition: { duration: 0.2, ease: "easeOut" }
        }
    };

    // Parse chapters with time information
    const parsedChapters = useMemo(() => {
        const re = /^\*\*(\d{2}:\d{2}:\d{2})\*\*\s*-\s*(.*)$/;
        return (analysis.chapters || []).map(raw => {
            const m = raw.match(re);
            const time = m ? m[1] : '00:00:00';
            const title = m ? m[2] : raw.replace(/\*\*/g, '');
            const [hh, mm, ss] = time.split(':').map(Number);
            const seconds = hh * 3600 + mm * 60 + ss;
            return { time, title, seconds };
        });
    }, [analysis.chapters]);

    // Highlight search terms in text
    function highlightSearchTerm(text, searchTerm) {
        if (!text || !searchTerm) return text;
        
        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark class="bg-yellow-200 text-yellow-800 px-1 rounded font-bold">$1</mark>');
    }
    
    return (
        <>
            <motion.div 
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                className="h-full cursor-pointer"
                onClick={() => setShowChapterModal(true)}
            >
                <motion.div variants={hoverVariants} className="h-full">
                    <Card className="overflow-hidden bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col h-full group">
                        {/* Video Thumbnail */}
                        <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden">
                            <Image
                                src={`https://img.youtube.com/vi/${analysis.video_id}/maxresdefault.jpg`}
                                alt={analysis.title}
                                fill
                                style={{ objectFit: 'cover' }}
                                className="transition-all duration-500 group-hover:scale-110"
                                sizes="(max-width: 768px) 100vw, 33vw"
                                quality={85}
                                onError={(e) => {
                                    e.target.src = `https://img.youtube.com/vi/${analysis.video_id}/hqdefault.jpg`;
                                }}
                            />
                            
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            
                            {/* Play Button */}
                            <motion.div 
                                className="absolute inset-0 flex items-center justify-center"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="bg-white/95 backdrop-blur-sm rounded-full p-4 shadow-2xl">
                                    <Play className="h-8 w-8 text-slate-800 ml-1" />
                                </div>
                            </motion.div>

                            {/* Badges */}
                            <div className="absolute top-4 left-4 flex gap-2">
                                <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                                    AI Analiz
                                </span>
                                {parsedChapters.length > 0 && (
                                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                                        <List className="h-3 w-3" />
                                        {parsedChapters.length}
                                    </span>
                                )}
                            </div>

                            {/* External Link */}
                            <div className="absolute top-4 right-4">
                                <a 
                                    href={`https://www.youtube.com/watch?v=${analysis.video_id}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors shadow-lg"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex-grow flex flex-col">
                            {/* Title */}
                            <h3 className="text-lg font-bold text-slate-800 line-clamp-2 mb-3 group-hover:text-emerald-700 transition-colors">
                                <Highlight text={analysis.title} query={query} />
                            </h3>
                            
                            {/* Stats */}
                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                                <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    <span>{parsedChapters.length} konu</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <BotMessageSquare className="h-4 w-4" />
                                    <span>AI Analizi</span>
                                </div>
                            </div>

                            {/* Chapter Preview - Show All */}
                            {parsedChapters.length > 0 && (
                                <div className="flex-grow">
                                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                        <List className="h-4 w-4 text-emerald-600" />
                                        Konu Başlıkları ({parsedChapters.length})
                                    </h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                                        {parsedChapters.map((chapter, chapterIndex) => (
                                            <div key={chapterIndex} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50/80 hover:bg-emerald-50/80 transition-colors">
                                                <span className="font-mono text-xs font-bold text-emerald-600 bg-white px-2 py-1 rounded-md shrink-0 shadow-sm">
                                                    {chapter.time}
                                                </span>
                                                <span 
                                                    className="text-sm text-slate-700 line-clamp-2"
                                                    dangerouslySetInnerHTML={{ __html: highlightSearchTerm(chapter.title, query) }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Button */}
                            <div className="mt-6">
                                <Button 
                                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowChapterModal(true);
                                    }}
                                >
                                    <BotMessageSquare className="mr-2 h-5 w-5" />
                                    Detaylı İncele
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </motion.div>

            {/* Chapter Navigation Modal */}
            <ChapterNavigationModal
                isOpen={showChapterModal}
                onClose={() => setShowChapterModal(false)}
                videoId={analysis.video_id}
                title={analysis.title}
                chapters={analysis.chapters || []}
                searchQuery={query}
            />
        </>
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
                            <Image src={logo.src} alt={logo.alt} width={120} height={40} style={{height:'auto', width:'auto'}} className="object-contain h-10 w-auto opacity-40 grayscale hover:grayscale-0 hover:opacity-80 transition-all duration-300" loading="lazy" />
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
    }, [quotes.length]);
    return (
        <div className="mt-8">
            {/* Loading text with rotating quotes - moved to top */}
            <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-3 h-3 bg-[#177267] rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                    <div className="w-3 h-3 bg-[#177267] rounded-full animate-bounce" style={{animationDelay: '150ms', opacity: 0.7}} />
                    <div className="w-3 h-3 bg-[#177267] rounded-full animate-bounce" style={{animationDelay: '300ms', opacity: 0.5}} />
                </div>
                <motion.p
                    key={quoteIndex}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.4 }}
                    className="text-slate-700 text-lg font-medium bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm inline-block"
                >
                    {quotes[quoteIndex]}
                </motion.p>
            </motion.div>
            
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
    const { play } = useAudio();
    const [query, setQuery] = useState('');
    const [allResults, setAllResults] = useState({ books: [], articles: [], videos: [], analyses: [], audio: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    // Modal state'leri
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [selectedBook, setSelectedBook] = useState(null);
    const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
    const [selectedArticleId, setSelectedArticleId] = useState(null);
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
 
    const resultsRef = useRef(null);

    useEffect(() => {
        const handler = setTimeout(() => {
            performSearch(query);
        }, 500);
        return () => clearTimeout(handler);
    }, [query, performSearch]);
  
    // Modal açma fonksiyonları
    const handleBookReadClick = (book) => { setSelectedBook(book); setIsBookModalOpen(true); };
    const handleArticleReadClick = (articleId) => { setSelectedArticleId(articleId); setIsArticleModalOpen(true); };
    const handleAudioPlayClick = (audio) => {
        play({
            id: `${audio.source}-${audio.id}`,
            title: audio.title.replace(/\.(mp3|wav|m4a)$/i, '').replace(/_/g, ' '),
            source: audio.source,
            mp3Filename: audio.mp3_filename,
            chapters: audio.matching_chapters || []
        });
    };
   
    // Arama kutusunu ve filtreleri temizler
    const handleClearSearch = () => {
        setQuery("");
    };
  
    const hasResults = allResults.books.length > 0 || allResults.articles.length > 0 || allResults.videos.length > 0 || allResults.analyses.length > 0 || allResults.audio.length > 0;

    // Smooth scroll to results when search completes
    useEffect(() => {
        if (hasResults && !isLoading && resultsRef.current) {
            const timer = setTimeout(() => {
                resultsRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                    inline: 'nearest'
                });
            }, 300); // Small delay to allow animations to start
            return () => clearTimeout(timer);
        }
    }, [hasResults, isLoading]);
 
    return (
      <div className="bg-slate-50 min-h-screen w-full font-sans">
        <main className="container mx-auto px-4 py-6 md:py-8">
          {/* Bismillah üstte */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, delay: 0.1 }} className="text-center mb-3"><p className="text-lg md:text-2xl text-slate-600" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</p></motion.div>
          {/* Namaz widget: bismillah altında (kaldırıldı) */}
         
          <motion.header initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="text-center">
            {/* Sabit alt metin kısmı geri getirildi */}
            <div className="relative mt-0 sm:-mt-0.5 md:-mt-1 mb-4 flex justify-center">
              <Image 
                src="/logo-bottom.svg" 
                alt="Mihmandar - Gönül Rehberiniz" 
                width={375} 
                height={112} 
                className="w-auto h-16 sm:h-18 md:h-20 lg:h-22 xl:h-24 object-contain max-w-full"
                priority
              />
            </div>
            <p className="mt-3 text-responsive text-slate-600 max-w-3xl mx-auto">Üstadlarımızın eserlerinde, sohbetlerinde derinlemesine arama yapın.</p>
            <LogoCarousel />
          </motion.header>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }} className="mt-6">
            <Card className="max-w-3xl mx-auto shadow-xl shadow-slate-200/70 border-t-4 border-primary bg-white/90 backdrop-blur-lg rounded-2xl">
              <CardContent className="p-4 md:p-6">
                <div className="space-y-4">
                <motion.div
                  className="relative"
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <motion.div
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    
                  </motion.div>
                  <Input
                    placeholder="Konu, eser veya yazar adı..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={`text-base md:text-lg h-14 pl-4 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 ${
                      query.trim() ? 'pr-32' : 'pr-12'
                    }`}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {/* Clear button with text - moved to right side of input */}
                      <AnimatePresence>
                        {query.trim() && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleClearSearch}
                              className="h-8 px-3 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100 border-slate-300 rounded-full transition-all duration-200"
                            >
                              <motion.div
                                whileHover={{ rotate: 90 }}
                                transition={{ duration: 0.2 }}
                                className="mr-1"
                              >
                                <X className="h-3 w-3" />
                              </motion.div>
                              Aramayı Temizle
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      {isLoading && (
                        <motion.div
                          initial={{ scale: 0, rotate: 0 }}
                          animate={{ scale: 1, rotate: 360 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                        >
                          <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                        </motion.div>
                      )}
                  </div>
                </motion.div>
              </div>
                {!query.trim() && !isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="pt-6 border-t border-slate-200/80 mt-6"
                  >
                    <SuggestionTags onSelect={(tag) => setQuery(tag)} />
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Results Section with enhanced animations */}
          <div ref={resultsRef} className="mt-8 md:mt-12 max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              {isLoading && !hasResults ? <motion.div key="loading"><ResultsSkeleton /></motion.div> :
               error ? <motion.div key="error"><InfoState title="Bir Hata Oluştu" message={error} icon={ServerCrash} /></motion.div> :
               !hasResults && query.trim() ? <motion.div key="no-results"><InfoState title="Sonuç Bulunamadı" message={`Aramanız için bir sonuç bulunamadı: "${query}". Lütfen yazımı kontrol edin.`} icon={FileQuestion} onClearFilters={handleClearSearch} /></motion.div> :
               !hasResults && !query.trim() ? <motion.div key="initial"><InfoState title="Aramaya Hazır" message="Hangi konuda araştırma yapmak istersiniz? Arama çubuğunu kullanabilirsiniz." icon={BookOpen} /></motion.div> :
               hasResults && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    ease: "easeOut"
                  }}
                  className="relative"
                >
                  {/* Fast, clean header */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.1,
                      duration: 0.3,
                      ease: "easeOut"
                    }}
                    className="text-center mb-8"
                  >
                    <motion.h2
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        delay: 0.15,
                        duration: 0.25
                      }}
                      className="text-2xl md:text-3xl font-bold text-slate-800 mb-2"
                    >
                      Arama Sonuçları
                    </motion.h2>
                    
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "80px" }}
                      transition={{
                        delay: 0.2,
                        duration: 0.3,
                        ease: "easeOut"
                      }}
                      className="h-1 bg-gradient-to-r from-primary/60 to-primary/80 mx-auto mb-3 rounded-full"
                    />
                    
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        delay: 0.25,
                        duration: 0.2
                      }}
                      className="text-slate-600 text-base"
                    >
                      &quot;{query}&quot; için bulunan sonuçlar
                    </motion.p>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.3,
                      duration: 0.3,
                      ease: "easeOut"
                    }}
                  >
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                   
                      <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-2 h-auto md:h-auto rounded-2xl p-3 bg-white border border-slate-200/60 shadow-sm">
                      <TabsTrigger value="kitaplar" disabled={allResults.books.length === 0} className="h-16 text-sm md:text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg gap-2 rounded-xl font-medium flex items-center justify-center px-4 col-span-2 md:col-span-1 transition-all duration-200">
                        <BookOpen className="h-5 w-5 shrink-0"/>
                        <span className="truncate">Kitaplar</span>
                        <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                          {allResults.books.length}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger value="makaleler" disabled={allResults.articles.length === 0} className="h-16 text-sm md:text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg gap-2 rounded-xl font-medium flex items-center justify-center px-4 transition-all duration-200">
                        <Newspaper className="h-5 w-5 shrink-0"/>
                        <span className="truncate">Makaleler</span>
                        <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                          {allResults.articles.length}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger value="ses-kayitlari" disabled={allResults.audio.length === 0} className="h-16 text-sm md:text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg gap-2 rounded-xl font-medium flex items-center justify-center px-4 transition-all duration-200">
                          <Music className="h-5 w-5 shrink-0"/>
                          <span className="truncate">Ses Kayıtları</span>
                          <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                            {allResults.audio.length}
                          </span>
                      </TabsTrigger>
                      <TabsTrigger value="videolar" disabled={allResults.videos.length === 0} className="h-16 text-sm md:text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg gap-2 rounded-xl font-medium flex items-center justify-center px-4 transition-all duration-200">
                        <Video className="h-5 w-5 shrink-0"/>
                        <span className="truncate">Videolar</span>
                        <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                          {allResults.videos.length}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger value="analizler" disabled={allResults.analyses.length === 0} className="h-16 text-sm md:text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg gap-2 rounded-xl font-medium flex items-center justify-center px-4 transition-all duration-200">
                        <BotMessageSquare className="h-5 w-5 shrink-0"/>
                        <span className="truncate">Analizler</span>
                        <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                          {allResults.analyses.length}
                        </span>
                      </TabsTrigger>
                    </TabsList>
                   
                        <TabsContent value="kitaplar" className="mt-8">
                          <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={{
                              visible: {
                                transition: {
                                  staggerChildren: 0.05,
                                  delayChildren: 0.1
                                }
                              }
                            }}
                            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
                          >
                            {allResults.books.map((r, i) => (
                              <motion.div
                                key={`book-${i}`}
                                variants={{
                                  hidden: {
                                    opacity: 0,
                                    y: 20,
                                    scale: 0.95
                                  },
                                  visible: {
                                    opacity: 1,
                                    y: 0,
                                    scale: 1,
                                    transition: {
                                      duration: 0.4,
                                      ease: "easeOut"
                                    }
                                  }
                                }}
                                whileHover={{
                                  y: -5,
                                  transition: { duration: 0.2, ease: "easeOut" }
                                }}
                              >
                                <BookResultCard result={r} onReadClick={handleBookReadClick} query={query} index={i} />
                              </motion.div>
                            ))}
                          </motion.div>
                        </TabsContent>
                        
                        <TabsContent value="makaleler" className="mt-8">
                          <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={{
                              visible: {
                                transition: {
                                  staggerChildren: 0.05,
                                  delayChildren: 0.1
                                }
                              }
                            }}
                            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
                          >
                            {allResults.articles.map((r, i) => (
                              <motion.div
                                key={`article-${i}`}
                                variants={{
                                  hidden: {
                                    opacity: 0,
                                    y: 20,
                                    scale: 0.95
                                  },
                                  visible: {
                                    opacity: 1,
                                    y: 0,
                                    scale: 1,
                                    transition: {
                                      duration: 0.4,
                                      ease: "easeOut"
                                    }
                                  }
                                }}
                                whileHover={{
                                  y: -5,
                                  transition: { duration: 0.2, ease: "easeOut" }
                                }}
                              >
                                <ArticleResultCard result={r} onReadClick={handleArticleReadClick} query={query} index={i} />
                              </motion.div>
                            ))}
                          </motion.div>
                        </TabsContent>
                        
                        <TabsContent value="ses-kayitlari" className="mt-8">
                          <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={{
                              visible: {
                                transition: {
                                  staggerChildren: 0.05,
                                  delayChildren: 0.1
                                }
                              }
                            }}
                            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
                          >
                            {allResults.audio.map((r, i) => (
                              <motion.div
                                key={`audio-${i}`}
                                variants={{
                                  hidden: {
                                    opacity: 0,
                                    y: 20,
                                    scale: 0.95
                                  },
                                  visible: {
                                    opacity: 1,
                                    y: 0,
                                    scale: 1,
                                    transition: {
                                      duration: 0.4,
                                      ease: "easeOut"
                                    }
                                  }
                                }}
                                whileHover={{
                                  y: -5,
                                  transition: { duration: 0.2, ease: "easeOut" }
                                }}
                              >
                                <AudioResultCard result={r} onPlayClick={handleAudioPlayClick} query={query} index={i} />
                              </motion.div>
                            ))}
                          </motion.div>
                        </TabsContent>
                        
                        <TabsContent value="videolar" className="mt-8">
                          <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={{
                              visible: {
                                transition: {
                                  staggerChildren: 0.05,
                                  delayChildren: 0.1
                                }
                              }
                            }}
                            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
                          >
                            {allResults.videos.map((v, i) => (
                              <motion.div
                                key={`video-${i}`}
                                variants={{
                                  hidden: {
                                    opacity: 0,
                                    y: 20,
                                    scale: 0.95
                                  },
                                  visible: {
                                    opacity: 1,
                                    y: 0,
                                    scale: 1,
                                    transition: {
                                      duration: 0.4,
                                      ease: "easeOut"
                                    }
                                  }
                                }}
                                whileHover={{
                                  y: -5,
                                  transition: { duration: 0.2, ease: "easeOut" }
                                }}
                              >
                                <VideoCard video={v} index={i} />
                              </motion.div>
                            ))}
                          </motion.div>
                        </TabsContent>
                        
                        <TabsContent value="analizler" className="mt-8">
                          <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={{
                              visible: {
                                transition: {
                                  staggerChildren: 0.05,
                                  delayChildren: 0.1
                                }
                              }
                            }}
                            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
                          >
                            {allResults.analyses.map((a, i) => (
                              <motion.div
                                key={`analysis-${i}`}
                                variants={{
                                  hidden: {
                                    opacity: 0,
                                    y: 20,
                                    scale: 0.95
                                  },
                                  visible: {
                                    opacity: 1,
                                    y: 0,
                                    scale: 1,
                                    transition: {
                                      duration: 0.4,
                                      ease: "easeOut"
                                    }
                                  }
                                }}
                                whileHover={{
                                  y: -5,
                                  transition: { duration: 0.2, ease: "easeOut" }
                                }}
                              >
                                <AnalysisCard analysis={a} query={query} index={i} />
                              </motion.div>
                            ))}
                          </motion.div>
                        </TabsContent>
                      </Tabs>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      
        <BookViewerDialog isOpen={isBookModalOpen} onClose={() => setIsBookModalOpen(false)} book={selectedBook} />
        <ArticleViewerDialog isOpen={isArticleModalOpen} onClose={() => setIsArticleModalOpen(false)} articleId={selectedArticleId} />
      </div>
    );
}

// Konum izni isteyen ve alınca widget'ı gösteren hero bileşeni
function GeolocatedHero() {
  const [coords, setCoords] = useState(null);
  const [asked, setAsked] = useState(false);
  useEffect(() => {
    if (asked || coords) return;
    if (!navigator.geolocation) return;
    setAsked(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [asked, coords]);
  if (!coords) return null;
  return <NamazWidget coords={coords} variant="hero" />;
}