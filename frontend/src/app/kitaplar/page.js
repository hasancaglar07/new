"use client";

import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, ArrowRight, BookOpen, Search, Library, ZoomIn, ZoomOut, RotateCcw, X, Crop, Eye } from "lucide-react";
import LoadingSpinner, { PageLoader, InlineLoader } from "@/components/LoadingSpinner";
import Image from 'next/image';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import dynamic from 'next/dynamic';
import 'cropperjs/dist/cropper.css';

// Lazy load Cropper to reduce bundle size
const Cropper = lazy(() => 
  import('react-cropper').then(module => ({
    default: module.default
  }))
);

import { Button } from "@/components/ui/button";
import MobileOptimizedButton from "@/components/MobileOptimizedButton";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { turkishIncludes, highlightTurkishText } from '@/utils/turkishSearch';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Color palettes for different authors
const authorColorPalettes = [
    { border: "border-emerald-400/60", text: "text-emerald-700/90", bg: "bg-emerald-50/40", accent: "emerald" },
];

const getAuthorColors = (authorName) => {
    return authorColorPalettes[0]; // Use first palette for all authors for consistency
};


// --- ALT BİLEŞENLER (TÜM DÜZELTMELERLE) ---

function BookViewerDialog({ book, onClose, isOpen, targetPage }) {
  const [currentPage, setCurrentPage] = useState(targetPage ? parseInt(targetPage) : 1);
  const [totalPages, setTotalPages] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const [showTargetPageNotice, setShowTargetPageNotice] = useState(!!targetPage);
  const [selectedText, setSelectedText] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareMenuPosition, setShareMenuPosition] = useState({ x: 0, y: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const [showSelectionBox, setShowSelectionBox] = useState(false);
  
  // Kırpma modu state'leri
  const [isCropMode, setIsCropMode] = useState(false);
  const [cropperRef, setCropperRef] = useState(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState(null);

  // Kırpma modu toggle fonksiyonları
  const toggleCropMode = useCallback(() => {
    setIsCropMode(!isCropMode);
    setShowSelectionBox(false);
    setShowShareMenu(false);
    if (isCropMode) {
      // Kırpma modundan çıkarken temizle
      setCroppedImageUrl(null);
    }
  }, [isCropMode]);

  // Kırpılmış görüntüye bilgi metni ekleme fonksiyonu
  const addInfoToCanvas = (canvas) => {
    const ctx = canvas.getContext('2d');
    const bookTitle = book?.kitap_adi || 'Kitap';
    const authorName = book?.yazar || book?.author || book?.yazarAdi || book?.authorName || 'Bilinmeyen Yazar';
    const pageUrl = `https://mihmandar.org/kitaplar?kitap=${encodeURIComponent(book?.kitap_adi || book?.kitap || 'kitap')}&sayfa=${currentPage}`;
    
    // Canvas boyutları
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Alt kısımda bilgi alanı için yer aç
    const infoHeight = 120;
    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvasWidth;
    newCanvas.height = canvasHeight + infoHeight;
    const newCtx = newCanvas.getContext('2d');
    
    // Orijinal görüntüyü üst kısma çiz
    newCtx.drawImage(canvas, 0, 0);
    
    // Alt kısımda beyaz arka plan
    newCtx.fillStyle = '#ffffff';
    newCtx.fillRect(0, canvasHeight, canvasWidth, infoHeight);
    
    // Üst kısımda hafif gölge
    const gradient = newCtx.createLinearGradient(0, canvasHeight - 20, 0, canvasHeight);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
    newCtx.fillStyle = gradient;
    newCtx.fillRect(0, canvasHeight - 20, canvasWidth, 20);
    
    // Metin stilleri
    newCtx.fillStyle = '#1f2937';
    newCtx.textAlign = 'left';
    
    // Kitap adı (büyük font)
    newCtx.font = 'bold 18px Arial, sans-serif';
    newCtx.fillText(`📚 ${bookTitle}`, 20, canvasHeight + 25);
    
    // Yazar adı
    newCtx.font = '14px Arial, sans-serif';
    newCtx.fillStyle = '#4b5563';
    newCtx.fillText(`✍️ ${authorName}`, 20, canvasHeight + 45);
    
    // Sayfa bilgisi
    newCtx.fillText(`📖 Sayfa ${currentPage}`, 20, canvasHeight + 65);
    
    // Link
    newCtx.fillStyle = '#059669';
    newCtx.font = '12px Arial, sans-serif';
    newCtx.fillText(`🔗 ${pageUrl}`, 20, canvasHeight + 85);
    
    // Logo/watermark (sağ alt)
    newCtx.fillStyle = '#6b7280';
    newCtx.font = '10px Arial, sans-serif';
    newCtx.textAlign = 'right';
    newCtx.fillText('mihmandar.org', canvasWidth - 20, canvasHeight + 105);
    
    return newCanvas;
  };

  const applyCrop = () => {
    console.log('applyCrop çağrıldı, cropperRef:', cropperRef);
    if (cropperRef && cropperRef.cropper) {
      console.log('Cropper instance bulundu');
      try {
        const canvas = cropperRef.cropper.getCroppedCanvas({
          width: 800,
          height: 600,
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high'
        });
        console.log('Canvas oluşturuldu:', canvas);
        if (canvas) {
          // Bilgi metni eklenmiş canvas oluştur
          const finalCanvas = addInfoToCanvas(canvas);
          
          // CORS sorunu için blob kullan
          finalCanvas.toBlob((blob) => {
            if (blob) {
              const croppedUrl = URL.createObjectURL(blob);
              console.log('Kırpılmış URL oluşturuldu:', croppedUrl);
              setCroppedImageUrl(croppedUrl);
              setIsCropMode(false);
              // Paylaşım menüsünü göster
              setShowShareMenu(true);
              setShareMenuPosition({ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 });
            }
          }, 'image/png', 0.9);
        }
      } catch (error) {
        console.error('Kırpma hatası:', error);
        // Fallback: Basit kırpma simülasyonu
        const cropData = cropperRef.cropper.getData();
        console.log('Crop data:', cropData);
        setCroppedImageUrl(imageUrl); // Geçici olarak orijinal görüntüyü kullan
        setIsCropMode(false);
        setShowShareMenu(true);
        setShareMenuPosition({ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 });
      }
    } else {
      console.log('cropperRef bulunamadı veya cropper instance yok');
    }
  };

  const cancelCrop = () => {
    setIsCropMode(false);
    setCroppedImageUrl(null);
  };

  // Kırpılmış görüntüyü indirme fonksiyonu
  const downloadCroppedImage = () => {
    if (croppedImageUrl) {
      const link = document.createElement('a');
      link.download = `${book?.kitap_adi || 'kitap'}_sayfa_${currentPage}_kirpilmis.png`;
      link.href = croppedImageUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

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
      
      // Skip if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.key === 'ArrowRight' && currentPage < totalPages && !isCropMode) {
        setCurrentPage(p => p + 1);
        announceToScreenReader(`Sayfa ${currentPage + 1} / ${totalPages}`);
      }
      else if (e.key === 'ArrowLeft' && currentPage > 1 && !isCropMode) {
        setCurrentPage(p => p - 1);
        announceToScreenReader(`Sayfa ${currentPage - 1} / ${totalPages}`);
      }
      else if (e.key === 'Escape') {
        if (isCropMode) {
          cancelCrop();
        } else if (showShareMenu) {
          setShowShareMenu(false);
          setShowSelectionBox(false);
        } else {
          onClose();
        }
      }
      else if (e.key === 'c' && e.ctrlKey) {
        e.preventDefault();
        toggleCropMode();
        announceToScreenReader(isCropMode ? 'Okuma moduna geçildi' : 'Kırpma moduna geçildi');
      }
      else if ((e.key === '+' || e.key === '=') && !isCropMode) {
        e.preventDefault();
        // Zoom in functionality would be called here
      }
      else if (e.key === '-' && !isCropMode) {
        e.preventDefault();
        // Zoom out functionality would be called here
      }
    };
    
    // Screen reader announcements
    const announceToScreenReader = (message) => {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.setAttribute('class', 'sr-only');
      announcement.textContent = message;
      document.body.appendChild(announcement);
      setTimeout(() => {
        if (document.body.contains(announcement)) {
          document.body.removeChild(announcement);
        }
      }, 1000);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, totalPages, isCropMode, showShareMenu, onClose, toggleCropMode]);

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
        
        if (width <= 15 || height <= 15) {
          setShowSelectionBox(false);
        } else {
          // Seçim yapıldı, paylaşım menüsünü göster
          setShowShareMenu(true);
          setShareMenuPosition({ x: e.clientX - 150, y: e.clientY - 100 });
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

    // Touch event handlers for mobile
    const handleTouchStart = (e) => {
      if (e.touches.length !== 1) return; // Only single touch
      const touch = e.touches[0];
      const target = e.target;
      if (target.tagName === 'IMG' || target.closest('.pdf-image-container')) {
        setIsSelecting(true);
        setShowSelectionBox(true);
        const rect = target.getBoundingClientRect();
        const startPos = {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top
        };
        setSelectionStart(startPos);
        setSelectionEnd(startPos);
        e.preventDefault();
      }
    };

    const handleTouchMove = (e) => {
      if (!isSelecting || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const target = document.querySelector('.pdf-image-container img');
      if (target) {
        const rect = target.getBoundingClientRect();
        setSelectionEnd({
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top
        });
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e) => {
      if (isSelecting) {
        setIsSelecting(false);
        const width = Math.abs(selectionEnd.x - selectionStart.x);
        const height = Math.abs(selectionEnd.y - selectionStart.y);
        
        if (width <= 15 || height <= 15) {
          setShowSelectionBox(false);
        } else {
          // Seçim yapıldı, paylaşım menüsünü göster
          const touch = e.changedTouches[0];
          setShowShareMenu(true);
          setShareMenuPosition({ x: touch.clientX - 150, y: touch.clientY - 100 });
        }
        e.preventDefault();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, isSelecting, selectionStart, selectionEnd]);

  // Seçilen alanı kırpma fonksiyonu
  const cropSelectedArea = async () => {
    if (!showSelectionBox) return null;
    
    try {
      const img = document.querySelector('.pdf-image-container img');
      if (!img) return null;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const rect = img.getBoundingClientRect();
      const scaleX = img.naturalWidth / rect.width;
      const scaleY = img.naturalHeight / rect.height;
      
      const startX = Math.min(selectionStart.x, selectionEnd.x) * scaleX;
      const startY = Math.min(selectionStart.y, selectionEnd.y) * scaleY;
      const width = Math.abs(selectionEnd.x - selectionStart.x) * scaleX;
      const height = Math.abs(selectionEnd.y - selectionStart.y) * scaleY;
      
      canvas.width = width;
      canvas.height = height;
      
      return new Promise((resolve) => {
        const tempImg = new Image();
        tempImg.crossOrigin = 'anonymous';
        tempImg.onload = () => {
          ctx.drawImage(tempImg, startX, startY, width, height, 0, 0, width, height);
          canvas.toBlob(resolve, 'image/png');
        };
        tempImg.src = img.src;
      });
    } catch (error) {
      console.error('Kırpma hatası:', error);
      return null;
    }
  };

  // WhatsApp paylaşımı
  const shareOnWhatsApp = async (text) => {
    const bookTitle = book?.kitap_adi || book?.kitap || 'Kitap';
    const authorName = book?.yazar || book?.author || book?.yazarAdi || book?.authorName || 
                      (book?.pdf_dosyasi ? book.pdf_dosyasi.split('-').slice(1).join('-').replace('.pdf', '').replace(/_/g, ' ') : 'Bilinmeyen Yazar');
    
    const pageUrl = `https://mihmandar.org/kitaplar?kitap=${encodeURIComponent(book?.kitap_adi || book?.kitap || 'kitap')}&sayfa=${currentPage}`;
    
    const croppedImage = await cropSelectedArea();
    
    if (croppedImage && navigator.share) {
      try {
        const file = new File([croppedImage], `${(bookTitle || 'Kitap').replace(/[^a-zA-Z0-9]/g, '_')}_sayfa_${currentPage}.png`, { type: 'image/png' });
        await navigator.share({
          title: `📚 ${bookTitle} | Mihmandar.org E-Kütüphanesi`,
          text: `📚 "${bookTitle}" - ${authorName}\n📖 Sayfa ${currentPage}\n\n💎 Bu değerli eserden bir bölüm paylaşıyorum...\n\n🔗 Bu sayfayı okumak için:\n${pageUrl}\n\n📚 Tüm kütüphaneyi keşfetmek için:\nmihmandar.org\n\n#MihmandarOrg #EKütüphane #Kitap #İlim #Maneviyat #Tasavvuf`,
          files: [file]
        });
      } catch (shareError) {
        const shareText = `📚 "${bookTitle}" - ${authorName}\n📖 Sayfa ${currentPage}\n\n💎 Bu değerli eserden bir bölüm paylaşıyorum...\n\n🔗 Bu sayfayı okumak için:\n${pageUrl}\n\n📚 Tüm kütüphaneyi keşfetmek için:\nmihmandar.org\n\n#MihmandarOrg #EKütüphane #Kitap #İlim #Maneviyat #Tasavvuf`;
        const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        window.open(url, '_blank');
      }
    } else {
      const shareText = `📚 "${bookTitle}" - ${authorName}\n📖 Sayfa ${currentPage}\n\n💎 Bu değerli eserden bir bölüm paylaşıyorum...\n\n🔗 Bu sayfayı okumak için:\n${pageUrl}\n\n📚 Tüm kütüphaneyi keşfetmek için:\nmihmandar.org\n\n#MihmandarOrg #EKütüphane #Kitap #İlim #Maneviyat #Tasavvuf`;
      const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(url, '_blank');
    }
    setShowShareMenu(false);
    setShowSelectionBox(false);
  };

  const shareOnFacebook = async (text) => {
    const bookTitle = book?.kitap_adi || book?.kitap || 'Kitap';
    const authorName = book?.yazar || book?.author || book?.yazarAdi || book?.authorName || 
                      (book?.pdf_dosyasi ? book.pdf_dosyasi.split('-').slice(1).join('-').replace('.pdf', '').replace(/_/g, ' ') : 'Bilinmeyen Yazar');
    
    const pageUrl = `https://mihmandar.org/kitaplar?kitap=${encodeURIComponent(book?.kitap_adi || book?.kitap || 'kitap')}&sayfa=${currentPage}`;
    
    const croppedImage = await cropSelectedArea();
    
    if (croppedImage && navigator.share) {
      try {
        const file = new File([croppedImage], `${(bookTitle || 'Kitap').replace(/[^a-zA-Z0-9]/g, '_')}_sayfa_${currentPage}.png`, { type: 'image/png' });
        await navigator.share({
          title: `📚 ${bookTitle} - Mihmandar.org E-Kütüphanesi`,
          text: `📚 ${bookTitle}\n\n✍️ Yazar: ${authorName}\n📖 Sayfa: ${currentPage}\n\n🌟 Bu değerli eserden özel bir bölüm paylaşıyorum. İlim ve maneviyat dolu bu kitabı Mihmandar.org E-Kütüphanesi'nde okuyabilirsiniz.\n\n🔗 Bu sayfayı okumak için:\n${pageUrl}\n\n📚 Tüm kütüphaneyi keşfetmek için:\nmihmandar.org\n\n#MihmandarOrg #EKütüphane #Kitap #İlim #Maneviyat #Tasavvuf #Eğitim #Bilgi`,
          files: [file]
        });
      } catch (shareError) {
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
    const authorName = book?.yazar || book?.author || book?.yazarAdi || book?.authorName || 
                      (book?.pdf_dosyasi ? book.pdf_dosyasi.split('-').slice(1).join('-').replace('.pdf', '').replace(/_/g, ' ') : 'Bilinmeyen Yazar');
    
    const pageUrl = `https://mihmandar.org/kitaplar?kitap=${encodeURIComponent(book?.kitap_adi || book?.kitap || 'kitap')}&sayfa=${currentPage}`;
    
    const croppedImage = await cropSelectedArea();
    
    if (croppedImage && navigator.share) {
      try {
        const file = new File([croppedImage], `${(bookTitle || 'Kitap').replace(/[^a-zA-Z0-9]/g, '_')}_sayfa_${currentPage}.png`, { type: 'image/png' });
        await navigator.share({
          title: `📚 ${bookTitle} | Mihmandar.org E-Kütüphanesi`,
          text: `📚 "${bookTitle}" - ${authorName}\n📖 Sayfa ${currentPage}\n\n💎 Bu değerli eserden bir bölüm...\n\n🔗 ${pageUrl}\n\n📚 mihmandar.org\n\n#MihmandarOrg #EKütüphane #Kitap #İlim #Maneviyat #Tasavvuf #Bilgi #Hikmet`,
          files: [file]
        });
      } catch (shareError) {
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
          <DialogTitle className="text-lg md:text-xl text-slate-100 line-clamp-1">{book.kitap_adi}</DialogTitle>
          <Button 
            aria-label="Kapat" 
            variant="ghost" 
            size="icon" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="text-slate-300 hover:text-white hover:bg-slate-700 min-h-[44px] min-w-[44px] touch-manipulation"
            style={{
              WebkitTapHighlightColor: 'rgba(255, 255, 255, 0.1)',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              touchAction: 'manipulation',
              cursor: 'pointer'
            }}
          >
            <X className="h-6 w-6"/>
          </Button>
        </DialogHeader>
        {showTargetPageNotice && (
          <div className="mt-2 p-2 bg-yellow-600/20 border border-yellow-500/30 rounded-lg flex items-center gap-2">
            <span className="text-yellow-300 text-sm">📍</span>
            <span className="text-yellow-100 text-sm font-medium">
              Sohbet asistanı tarafından referans gösterilen sayfa: {targetPage}
            </span>
            <button 
              onClick={() => setShowTargetPageNotice(false)}
              className="ml-auto text-yellow-300 hover:text-yellow-100 text-xs"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex-grow w-full h-full flex justify-center items-center overflow-hidden relative">
          {isLoading && <LoadingSpinner size="xl" variant="muted" className="absolute z-10" />}
          {imageUrl && (
            <TransformWrapper 
              limitToBounds={true} 
              doubleClick={{ mode: 'reset', disabled: isSelecting || isCropMode }} 
              pinch={{ step: 1, disabled: isSelecting || isCropMode }} 
              wheel={{ step: 0.2, disabled: isCropMode }}
              panning={{ disabled: isCropMode }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                   <div className="absolute top-4 right-4 z-20 flex flex-col gap-3">
                    <Button 
                      aria-label="Yakınlaştır" 
                      onClick={() => zoomIn()} 
                      disabled={isCropMode}
                      className={`${isCropMode ? 'bg-slate-600/50 cursor-not-allowed' : 'bg-slate-900/80 hover:bg-slate-800/90'} text-white backdrop-blur-sm h-12 w-12 md:h-10 md:w-10 p-0 rounded-lg shadow-lg border border-slate-700/50`}
                      size="lg"
                    >
                      <ZoomIn className="h-6 w-6 md:h-5 md:w-5" />
                    </Button>
                    <Button 
                      aria-label="Uzaklaştır" 
                      onClick={() => zoomOut()} 
                      disabled={isCropMode}
                      className={`${isCropMode ? 'bg-slate-600/50 cursor-not-allowed' : 'bg-slate-900/80 hover:bg-slate-800/90'} text-white backdrop-blur-sm h-12 w-12 md:h-10 md:w-10 p-0 rounded-lg shadow-lg border border-slate-700/50`}
                      size="lg"
                    >
                      <ZoomOut className="h-6 w-6 md:h-5 md:w-5" />
                    </Button>
                    <Button 
                      aria-label="Görünümü sıfırla" 
                      onClick={() => resetTransform()} 
                      disabled={isCropMode}
                      className={`${isCropMode ? 'bg-slate-600/50 cursor-not-allowed' : 'bg-slate-900/80 hover:bg-slate-800/90'} text-white backdrop-blur-sm h-12 w-12 md:h-10 md:w-10 p-0 rounded-lg shadow-lg border border-slate-700/50`}
                      size="lg"
                    >
                      <RotateCcw className="h-6 w-6 md:h-5 md:w-5" />
                    </Button>
                    <Button 
                      aria-label={isCropMode ? "Okuma Modu" : "Kırpma Modu"} 
                      onClick={toggleCropMode} 
                      className={`${isCropMode ? 'bg-orange-600/80 hover:bg-orange-700/90' : 'bg-blue-600/80 hover:bg-blue-700/90'} text-white backdrop-blur-sm h-12 w-12 md:h-10 md:w-10 p-0 rounded-lg shadow-lg border ${isCropMode ? 'border-orange-500/50' : 'border-blue-500/50'}`}
                      size="lg"
                    >
                      {isCropMode ? <Eye className="h-6 w-6 md:h-5 md:w-5" /> : <Crop className="h-6 w-6 md:h-5 md:w-5" />}
                    </Button>
                    
                    {/* Kırpma Modu Kontrolleri */}
                    {isCropMode && (
                      <>
                        <Button 
                          aria-label="Kırpmayı Uygula" 
                          onClick={applyCrop} 
                          className="bg-green-600/80 hover:bg-green-700/90 text-white backdrop-blur-sm h-12 w-12 md:h-10 md:w-auto md:px-3 p-0 rounded-lg shadow-lg border border-green-500/50 text-xs md:text-sm font-medium"
                          size="lg"
                        >
                          <span className="md:hidden text-lg">✓</span>
                          <span className="hidden md:inline">Uygula</span>
                        </Button>
                        <Button 
                          aria-label="Kırpmayı İptal Et" 
                          onClick={cancelCrop} 
                          className="bg-red-600/80 hover:bg-red-700/90 text-white backdrop-blur-sm h-12 w-12 md:h-10 md:w-auto md:px-3 p-0 rounded-lg shadow-lg border border-red-500/50 text-xs md:text-sm font-medium"
                          size="lg"
                        >
                          <span className="md:hidden text-lg">✕</span>
                          <span className="hidden md:inline">İptal</span>
                        </Button>
                      </>
                    )}
                    
                    <div className="flex flex-col gap-3">
                      {pdfUrl && 
                        <Button 
                          aria-label="PDF'yi yeni sekmede aç" 
                          onClick={()=> window.open(pdfUrl, '_blank')} 
                          className="bg-emerald-600/80 hover:bg-emerald-700/90 text-white backdrop-blur-sm h-12 w-12 md:h-10 md:w-auto md:px-3 p-0 rounded-lg shadow-lg border border-emerald-500/50 text-xs md:text-sm font-medium"
                          size="lg"
                        >
                          <span className="md:hidden text-lg">📄</span>
                          <span className="hidden md:inline">PDF</span>
                        </Button>
                      }
                    </div>
                  </div>
                  <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                    <div className="pdf-image-container relative w-full h-full">
                      {isCropMode ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <Suspense fallback={<div className="flex items-center justify-center w-full h-full"><LoadingSpinner size="lg" variant="muted" /></div>}>
                            <Cropper
                             src={imageUrl}
                             style={{ height: '100%', width: '100%', maxHeight: '80vh' }}
                             initialAspectRatio={1}
                             guides={true}
                             viewMode={1}
                             dragMode="crop"
                             scalable={true}
                             cropBoxMovable={true}
                             cropBoxResizable={true}
                             toggleDragModeOnDblclick={false}
                             onInitialized={(instance) => {
                               setCropperRef(instance);
                             }}
                             ref={(cropper) => {
                               setCropperRef(cropper);
                             }}
                             responsive={true}
                             restore={false}
                             checkCrossOrigin={true}
                             crossOrigin="anonymous"
                             checkOrientation={false}
                             modal={true}
                             background={true}
                             autoCrop={true}
                             autoCropArea={0.6}
                             movable={false}
                             rotatable={false}
                             zoomable={true}
                             zoomOnTouch={true}
                             zoomOnWheel={true}
                             wheelZoomRatio={0.1}
                             minCropBoxHeight={50}
                             minCropBoxWidth={50}
                             />
                           </Suspense>
                        </div>
                      ) : (
                        <>
                          <Image 
                            key={imageUrl} 
                            src={imageUrl} 
                            alt={`Sayfa ${currentPage}`} 
                            onLoad={() => setIsLoading(false)} 
                            onError={() => { setIsLoading(false); }} 
                            fill 
                            style={{ objectFit: 'contain' }} 
                            className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`} 
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                            priority={currentPage === 1}
                            loading={currentPage === 1 ? 'eager' : 'lazy'}
                            quality={85}
                            placeholder="blur"
                            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                          />
                          
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
                        </>
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
            {croppedImageUrl && (
              <div className="text-sm text-green-400 font-medium px-2">
                ✓ Kırpılmış görüntü hazır
              </div>
            )}
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
        
        {/* Share Menu for PDF Cropped Content */}
        <AnimatePresence>
          {showShareMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="share-menu fixed z-[9999] bg-white rounded-lg shadow-2xl border border-slate-200 p-4 flex items-center gap-3"
              style={{
                left: Math.max(10, Math.min(shareMenuPosition.x, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 320)),
                top: Math.max(10, shareMenuPosition.y),
                pointerEvents: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  shareOnWhatsApp();
                }}
                className="p-3 text-green-600 hover:bg-green-50 rounded-lg transition-colors flex flex-col items-center justify-center min-w-[80px]"
                title="WhatsApp'ta Paylaş"
              >
                <span className="text-2xl mb-1">📱</span>
                <span className="text-xs font-medium">WhatsApp</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  shareOnFacebook();
                }}
                className="p-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex flex-col items-center justify-center min-w-[80px]"
                title="Facebook'ta Paylaş"
              >
                <span className="text-2xl mb-1">👥</span>
                <span className="text-xs font-medium">Facebook</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  shareOnTwitter();
                }}
                className="p-3 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors flex flex-col items-center justify-center min-w-[80px]"
                title="X'te Paylaş"
              >
                <span className="text-2xl mb-1">🐦</span>
                <span className="text-xs font-medium">X (Twitter)</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  downloadCroppedImage();
                }}
                className="p-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex flex-col items-center justify-center min-w-[80px]"
                title="İndir"
              >
                <span className="text-2xl mb-1">💾</span>
                <span className="text-xs font-medium">İndir</span>
              </button>
              <button
                onClick={() => setShowShareMenu(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
                title="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-slate-200 rotate-45"></div>
            </motion.div>
          )}
        </AnimatePresence>
 
    </Dialog>
  );
}

function Highlight({ text, query }) {
    if (!query || !text) return text;
    // Türkçe karakter uyumlu vurgulama için HTML string döndür
    const highlightedHtml = highlightTurkishText(text, query);
    return <span dangerouslySetInnerHTML={{ __html: highlightedHtml }} />;
}

function BookCard({ book, onReadClick, searchTerm, colors }) {
    const cardVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.98 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.4,
                ease: "easeOut"
            }
        }
    };
    
    return (
        <motion.div 
            variants={cardVariants} 
            className="h-full"
            whileHover={{ 
                y: -4, 
                transition: { duration: 0.2, ease: "easeOut" } 
            }}
        >
            <Card className={`flex flex-col h-full overflow-hidden bg-white hover:shadow-xl transition-all duration-300 group ${colors.border} hover:border-opacity-80 rounded-2xl`}>
                <CardHeader className="p-6 pb-4">
                    <div className="flex items-start justify-between mb-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                            <BookOpen className="w-3 h-3 mr-1.5" />
                            Kitap
                        </span>
                    </div>
                    
                    <CardTitle className="text-lg font-bold text-slate-800 leading-tight line-clamp-2 group-hover:text-emerald-700 transition-colors">
                        <Highlight text={book.kitap_adi} query={searchTerm} />
                    </CardTitle>
                    
                    <p className="text-sm text-slate-600 mt-2 font-medium">
                        <Highlight text={book.yazar} query={searchTerm} />
                    </p>
                </CardHeader>
                
                <CardFooter className="p-6 pt-0 mt-auto">
                    <Button 
                        onClick={() => onReadClick(book)} 
                        className={`w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium py-2.5 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl group-hover:scale-105`}
                    >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Oku
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

                {/* Filters Skeleton */}
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

                {/* Content Skeleton */}
                <div className="space-y-16">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-200 rounded-full animate-pulse"></div>
                                <div className="h-8 bg-emerald-200 rounded-md w-64 animate-pulse"></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {[1, 2, 3, 4].map(j => (
                                    <div key={j} className="bg-white rounded-2xl border border-emerald-200/50 overflow-hidden animate-pulse">
                                        <div className="p-6">
                                            <div className="h-4 bg-emerald-100 rounded w-16 mb-4 animate-pulse"></div>
                                             <div className="h-6 bg-slate-300 rounded w-full mb-2 animate-pulse"></div>
                                             <div className="h-6 bg-slate-200 rounded w-3/4 animate-pulse"></div>
                                         </div>
                                         <div className="p-6 pt-0">
                                             <div className="h-10 bg-emerald-200 rounded-xl animate-pulse"></div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     ))}
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
 function LibraryContent() {
     const searchParams = useSearchParams();
     const targetPage = searchParams.get('sayfa') || searchParams.get('page');
     const openBook = searchParams.get('kitap') || searchParams.get('open'); // Direkt açılacak kitap
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
             } catch (error) { 
                 console.error("Kütüphane verisi alınırken hata:", error);
             } 
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
                 // Eğer searchTerm boş ise tüm kitapları göster
                 return !searchTerm.trim() || turkishIncludes(book.kitap_adi, searchTerm);
             });
             if (filteredBooks.length === 0) return null;
             return { ...authorData, kitaplar: filteredBooks };
         }).filter(Boolean);
     }, [libraryData, selectedAuthor, searchTerm]);
 
     // Direkt kitap açma işlemi
     useEffect(() => {
         if (openBook && libraryData.length > 0 && !isModalOpen) {
             // URL'den gelen kitap adını decode et
             const decodedBookName = decodeURIComponent(openBook);
             
             // Tüm kitaplar arasında ara
             for (const authorData of libraryData) {
                 const foundBook = authorData.kitaplar.find(book => {
                     // Kitap adı ile tam eşleşme
                     if (book.kitap_adi === decodedBookName) return true;
                     
                     // PDF dosya adı ile eşleşme
                     if (book.pdf_dosyasi === openBook || book.pdf_dosyasi === `${openBook}.pdf`) return true;
                     
                     // Türkçe karakterleri dikkate alarak kısmi eşleşme
                     if (turkishIncludes(book.kitap_adi, decodedBookName)) return true;
                     
                     // Kitap adının normalize edilmiş hali ile eşleşme
                     const normalizedBookTitle = book.kitap_adi.toLowerCase().replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ0-9]/g, '');
                     const normalizedSearchTerm = decodedBookName.toLowerCase().replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ0-9]/g, '');
                     if (normalizedBookTitle.includes(normalizedSearchTerm)) return true;
                     
                     return false;
                 });
                 
                 if (foundBook) {
                     setSelectedBook(foundBook);
                     setIsModalOpen(true);
                     break;
                 }
             }
         }
     }, [openBook, libraryData, isModalOpen]);
 
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
                 
                 {selectedBook && <BookViewerDialog book={selectedBook} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} targetPage={targetPage} />}
             </div>
         </div>
     );
 }
 
 export default function LibraryPage() {
     return (
         <Suspense fallback={
             <div className="min-h-screen bg-gradient-to-br from-emerald-50/30 via-teal-50/20 to-green-50/30 flex items-center justify-center">
                 <div className="text-center">
                     <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-4" />
                     <p className="text-slate-600">Kütüphane yükleniyor...</p>
                 </div>
             </div>
         }>
             <LibraryContent />
         </Suspense>
     );
 }