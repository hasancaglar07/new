"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Settings, RotateCcw, History, Volume2, VolumeX, Copy, ThumbsUp, ThumbsDown, Share2, Download, Mic, MicOff, Send, Loader2, AlertCircle, CheckCircle2, ExternalLink, Book, FileText, Play, Pause, SkipBack, SkipForward, RefreshCw, X, ArrowUp } from 'lucide-react';
import { useChat, ChatProvider } from '@/components/chat/ChatProvider';
import MessageComponent from '@/components/chat/MessageComponent';
import ChatInput from '@/components/chat/ChatInput';
import ChatHistory from '@/components/chat/ChatHistory';

function ChatInterface() {
  const {
    messages,
    isLoading,
    addMessage,
    clearChat,
    setLoading
  } = useChat();

  // Refs
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // State
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    if (typeof window !== 'undefined') {
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  // Settings state
  const [settings, setSettings] = useState({
    autoSpeak: false,
    speechSpeed: 1,
    speechVolume: 0.8,
    showSources: true,
    autoScroll: true
  });

  // Auto scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (settings.autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [settings.autoScroll]);

  // Scroll to top
  const scrollToTop = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Handle scroll events
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollToTop(scrollTop > 300 && !isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto scroll when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle message sending
  const handleSendMessage = useCallback(async (content, audioFile = null) => {
    try {
      // Add user message
      addMessage({
        type: 'user',
        content: content
      });
      
      // Set loading state
      setLoading(true);
      
      // Call backend API with timeout
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout
      
      const response = await fetch(`${API_BASE_URL}/chat/advanced`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          session_id: `session_${Date.now()}`,
          use_vector_search: true,
          max_sources: 6,
          temperature: 0.4,
          max_tokens: 2000,
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.1,
          system_prompt: `Sen Mihmandar AI'sın. İslami ve tasavvufi konularda uzman bir rehbersin. 

ÖNCELİKLİ YAZARLAR (Ana Kaynaklar):
1. **Ali Ramazan Dinç Efendi** - Seyrsuluk, Kemalat, Manevi Yolculuk
2. **Hacı Hasan Efendi** - Sohbetler, Dergahtan Dürdaneler, Şifa Tarifesi
3. **M.Esad Erbili Efendi** - Kenzul İrfan, Mektubat, Risale-i Esadiyye

GELİŞMİŞ ARAMA STRATEJİSİ:
- İlk önce 3 ana yazarın eserlerinde ara
- Whoosh benzeri fuzzy search kullan: benzer kelimeler, kök kelimeler
- Örnek: "letaif" → "latif, latife, letayif, kalp, merkez, manevi"
- Anahtar kelimeyi parçala ve kombinasyonlar dene
- Yazar + konu kombinasyonu: "Hacı Hasan Efendi + letaif"
- Eş anlamlı terimlerle genişlet

KAYNAK ÖNCELİĞİ:
- %70 ANA 3 YAZAR kitapları (en güvenilir)
- %20 Diğer kitaplar (M.Sami Ramazanoğlu vb.)
- %10 Makaleler (destekleyici)
- Her cevabda en az 3-4 ana yazar kaynağı kullan

EĞER KAYNAK BULAMAZSAN:
1. "Bu konuda kaynaklarımızda sınırlı bilgi bulunmaktadır" de
2. Ana yazarlardan alternatif öner: "Ali Ramazan Dinç Efendi'nin X konusuna bakın"
3. Benzer konular öner: "İlgili: kalp, nefis, ruh konularına bakabilirsiniz"
4. Asla uydurma bilgi verme, sadece mevcut kaynaklardan yararlan

Cevaplarını şu formatta ver:

🌹 **ÖZET** (2-3 cümle)

📖 **DETAYLI AÇIKLAMA** 
- Ana konuları madde işaretli olarak açıkla
- Her önemli noktayı **kalın** yaz
- Direkt kitap alıntıları: "Hacı Hasan Efendi der ki: '...'" 
- Bölüm/sayfa referansları: (Sohbetler 1, Bölüm 3, s.45)
- Kitap kaynaklarını öncelikle kullan

📚 **KİTAP ALINTILARI** (Öncelikli)
> "Direkt alıntı metni" - Yazar Adı, Kitap Adı, Bölüm/s.XX
> "İkinci alıntı" - Başka Yazar, Eser Adı, s.YY

📄 **MAKALE DESTEĞİ** (Destekleyici)
- Makale kaynaklarını destekleyici olarak kullan
- Makale referansları: (Makale Başlığı, Yazar)

💡 **PRATİK UYGULAMA**
- Günlük hayata yönelik öneriler
- Amel ve zikir tavsiyeleri
- Kitaplardan pratik örnekler

🔗 **İLGİLİ KİTAP ÖNERİLERİ**
- Aynı konudaki diğer kitaplar
- İlgili bölümler ve eserler

⚠️ **ALTERNATİF ARAMA ÖNERİLERİ** (Eğer kaynak azsa)
- "Şu terimlerle tekrar deneyin: [alternatif terimler]"
- "İlgili konular: [benzer konular]"

Kitap kaynaklarını öncelikle kullan, daha güvenilir ve detaylı bilgi verirler. Kaynak bulamazsan dürüst ol ve alternatif öner.`
        })
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        
        // Add AI response
        addMessage({
          type: 'assistant',
          content: data.response || 'Üzgünüm, şu anda size yardımcı olamıyorum.',
          sources: data.sources || []
        });
      } else {
        // Add error message
        addMessage({
          type: 'assistant',
          content: `Üzgünüm, bir hata oluştu (${response.status}). Lütfen tekrar deneyin.`,
          sources: []
        });
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error sending message:', error);
      
      let errorMessage = 'Bağlantı hatası. Lütfen tekrar deneyin.';
      
      if (error.name === 'AbortError') {
        errorMessage = 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edin.';
      }
      
      // Add error message
      addMessage({
        type: 'assistant',
        content: errorMessage,
        sources: []
      });
    } finally {
      setLoading(false);
    }
  }, [addMessage, setLoading]);

  // Handle source click
  const handleSourceClick = useCallback((source) => {
    console.log('Source clicked:', source);
  }, []);

  // Handle feedback
  const handleFeedback = useCallback((messageId, feedbackType) => {
    console.log('Feedback:', messageId, feedbackType);
  }, []);

  // Clear chat
  const handleClearChat = useCallback(() => {
    if (window.confirm('Sohbeti temizlemek istediğinizden emin misiniz?')) {
      clearChat();
    }
  }, [clearChat]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Main Layout - Full Height */}
      <div className="flex h-screen">
        {/* Professional Sidebar - Desktop Only */}
        {!isMobile && (
          <aside className="w-80 bg-white/95 backdrop-blur-lg border-r border-slate-200/80 shadow-sm flex flex-col">
            {/* Sidebar Header */}
            <div className="p-6 border-b border-slate-200/60">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-xl flex items-center justify-center shadow-md ring-1 ring-emerald-200">
                  <History className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Sohbet Geçmişi</h2>
                  <p className="text-sm text-slate-500 font-medium">Önceki konuşmalarınız</p>
                </div>
              </div>
              
              {/* Professional Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Geçmişte ara..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-emerald-50/50 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 placeholder-emerald-400 font-medium"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Chat History Content */}
            <div className="flex-1 overflow-hidden bg-slate-50/30">
              <ChatHistory 
                isOpen={true}
                onClose={() => {}}
                searchQuery={historySearchQuery}
                onSelectChat={(chat) => {
                  if (chat.slug) {
                    window.open(`/sohbet/${chat.slug}`, '_blank');
                  }
                }}
              />
            </div>
          </aside>
        )}
        
        {/* Professional Main Chat Area */}
        <main className="flex-1 flex flex-col bg-gradient-to-br from-white via-slate-50/30 to-emerald-50/20 relative">
        {messages.length === 0 ? (
          // Modern 2025 Welcome Layout
           <div className="flex-1 flex flex-col justify-center items-center px-6 py-8 min-h-[85vh]">
             <div className="w-full max-w-5xl mx-auto text-center space-y-10">
              {/* Modern Welcome Header */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="space-y-8"
              >
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl">
                  <Image 
                    src="/logo-top.svg" 
                    alt="Mihmandar" 
                    width={48}
                    height={48}
                    className="w-12 h-12"
                  />
                </div>
                
                <div className="space-y-6">
                  <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight tracking-tight">
                    Selamün Aleyküm! 🌹
                  </h1>
                  
                  <p className="text-2xl md:text-3xl text-gray-600 font-normal leading-relaxed">
                    Ben Mihmandar, akıllı asistanınızım.
                  </p>
                  
                  <p className="text-xl text-gray-500 leading-relaxed max-w-3xl mx-auto">
                    İslami ve tasavvufi konularda sorularınızı sorabilirsiniz.
                  </p>
                </div>
              </motion.div>
              
              {/* Google-style Smart Suggestions for Welcome - Hidden on Mobile */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className="w-full max-w-4xl mx-auto mb-6 hidden sm:block"
              >
                <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2 justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Akıllı Soru Önerileri
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      "Rabıta nedir ve nasıl yapılır?",
                      "Nefis terbiyesi nasıl olur?",
                      "Zikir çeşitleri nelerdir?",
                      "Mürşit-mürit ilişkisi nasıl olmalı?",
                      "Fena ve beka kavramları nedir?",
                      "Manevi makamlar nelerdir?"
                    ].map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSendMessage(suggestion)}
                        className="text-left p-3 text-sm text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300 rounded-lg transition-all duration-200 font-medium flex items-center gap-2"
                      >
                        <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
              
              {/* Modern Input Container */}
               <motion.div
                 initial={{ opacity: 0, y: 30 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                 className="w-full max-w-4xl mx-auto"
               >
                 <div className="bg-white rounded-3xl border-2 border-emerald-200 shadow-xl p-6 hover:shadow-2xl hover:border-emerald-300 transition-all duration-300">
                  <ChatInput 
                    onSendMessage={handleSendMessage}
                    disabled={isLoading}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        ) : (
          // Modern Chat Layout
          <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col px-4 sm:px-6 py-4">
          
            {/* Google-style Smart Suggestions - Hidden on Mobile */}
            <div className="mb-6 hidden sm:block">
              <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-4">
                <h3 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Akıllı Soru Önerileri
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    "Rabıta nedir ve nasıl yapılır?",
                    "Nefis terbiyesi nasıl olur?",
                    "Zikir çeşitleri nelerdir?",
                    "Mürşit-mürit ilişkisi nasıl olmalı?",
                    "Fena ve beka kavramları nedir?",
                    "Manevi makamlar nelerdir?"
                  ].map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(suggestion)}
                      className="text-left p-3 text-sm text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300 rounded-lg transition-all duration-200 font-medium flex items-center gap-2"
                    >
                      <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          
            {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              role="log"
              aria-live="polite"
              aria-label="Sohbet mesajları"
              className="space-y-4 mb-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-emerald-300 scrollbar-track-transparent pr-2"
            >
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <MessageComponent
                  key={message.id}
                  message={message}
                  onSourceClick={handleSourceClick}
                  onFeedback={handleFeedback}
                />
              ))}
            </AnimatePresence>
            
            {/* Modern 2025 Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <div className="relative mb-10">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                    className="relative w-20 h-20 flex items-center justify-center"
                  >
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl">
                      <Image 
                        src="/logo-top.svg" 
                        alt="Mihmandar" 
                        width={40}
                        height={40}
                        className="w-10 h-10"
                      />
                    </div>
                  </motion.div>
                  
                  {/* Pulse rings */}
                  <motion.div
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                    className="absolute inset-0 bg-emerald-500 rounded-3xl"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.3], opacity: [0.3, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                    className="absolute inset-0 bg-emerald-400 rounded-3xl"
                  />
                </div>
                
                <div className="text-center space-y-8 max-w-2xl mx-auto">
                  <motion.p
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-gray-800 font-semibold text-xl"
                  >
                    Düşünüyor ve araştırıyor...
                  </motion.p>
                  
                  <motion.div
                    animate={{ width: ["30%", "100%", "30%"] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="h-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full mx-auto max-w-sm"
                  />
                  
                  <motion.div
                    animate={{ opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg"
                  >
                    <div className="text-gray-800 text-base font-semibold mb-3">Bilgi Hazırlanıyor...</div>
                    <div className="text-gray-600 text-base leading-relaxed">
                      &ldquo;İlim öğrenmek her Müslüman erkek ve kadına farzdır.&rdquo; 
                      <span className="block mt-3 text-gray-500 font-semibold">- Hz. Muhammed (s.a.v)</span>
                    </div>
                  </motion.div>
                  
                  <motion.p
                    animate={{ opacity: [0.5, 0.9, 0.5] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                    className="text-gray-600 text-base font-medium"
                  >
                    Kaynaklardan bilgi topluyorum...
                  </motion.p>
                </div>
              </motion.div>
            )}
            
            {/* Chat History Sidebar */}
            {typeof window !== 'undefined' && (
              <React.Fragment>
                {/* Desktop sidebar is now handled above */}
                
                {/* Modern Mobile Sidebar */}
                {isMobile && showChatHistory && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" 
                    onClick={() => setShowChatHistory(false)}
                  >
                    <motion.div 
                      initial={{ x: -320, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -320, opacity: 0 }}
                      transition={{ type: "spring", damping: 25, stiffness: 200 }}
                      className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white/95 backdrop-blur-md shadow-2xl" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Mobile Sidebar Header */}
                      <div className="p-6 border-b border-gray-200/60 bg-gradient-to-r from-emerald-50 to-green-50">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-emerald-700 to-green-800 rounded-xl flex items-center justify-center shadow-lg">
                              <History className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h2 className="text-lg font-bold text-gray-900">Sohbet Geçmişi</h2>
                              <p className="text-sm text-gray-500">Önceki konuşmalarınız</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowChatHistory(false)}
                            className="text-gray-500 hover:text-gray-700 hover:bg-white/60 rounded-xl p-2"
                          >
                            <X className="w-5 h-5" />
                          </Button>
                        </div>
                        
                        {/* Mobile Search */}
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Geçmişte ara..."
                            value={historySearchQuery}
                            onChange={(e) => setHistorySearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 text-sm bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all duration-200 placeholder-gray-400"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      {/* Mobile Chat History Content */}
                      <div className="flex-1 overflow-hidden">
                        <ChatHistory 
                          isOpen={true}
                          onClose={() => setShowChatHistory(false)}
                          searchQuery={historySearchQuery}
                          onSelectChat={(chat) => {
                            if (chat.slug) {
                              window.open(`/sohbet/${chat.slug}`, '_blank');
                            }
                            setShowChatHistory(false);
                          }}
                        />
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </React.Fragment>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Scroll to Top Button */}
          <AnimatePresence>
            {showScrollToTop && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-16 right-6 z-30"
              >
                <Button
                  onClick={scrollToTop}
                  className="w-11 h-11 rounded-full bg-white border border-gray-200 shadow-lg hover:shadow-xl text-gray-700 hover:text-gray-900 transition-all duration-200"
                >
                  <ArrowUp className="w-5 h-5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          
            {/* Modern Chat Input - Sticky Bottom */}
            <div className="sticky bottom-0 bg-white/98 backdrop-blur-xl border-t border-emerald-200/60 p-4 sm:p-6">
              <div className="max-w-4xl mx-auto">
                <ChatInput 
                  onSendMessage={handleSendMessage}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Floating Action Buttons */}
        <div className="fixed top-20 sm:top-16 right-4 z-40 flex flex-col gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            className="h-10 w-10 bg-emerald-50/90 backdrop-blur-lg border border-emerald-200 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center"
            title="Sohbeti Temizle"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChatHistory(true)}
              className="h-10 w-10 bg-emerald-50/90 backdrop-blur-lg border border-emerald-200 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center"
              title="Sohbet Geçmişi"
            >
              <History className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(true)}
            className="h-10 w-10 bg-emerald-50/90 backdrop-blur-lg border border-emerald-200 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center"
            title="Ayarlar"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
        </main>
      </div>
      
      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Sohbet Ayarları
            </DialogTitle>
            <DialogDescription>
              Sohbet deneyiminizi kişiselleştirin
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Auto Speak */}
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-speak" className="text-sm font-medium">
                Otomatik Sesli Okuma
              </Label>
              <Switch
                id="auto-speak"
                checked={settings.autoSpeak}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, autoSpeak: checked }))
                }
              />
            </div>
            
            {/* Speech Speed */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Konuşma Hızı: {settings.speechSpeed}x
              </Label>
              <Slider
                value={[settings.speechSpeed]}
                onValueChange={([value]) => 
                  setSettings(prev => ({ ...prev, speechSpeed: value }))
                }
                max={2}
                min={0.5}
                step={0.1}
                className="w-full"
              />
            </div>
            
            {/* Speech Volume */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Ses Seviyesi: {Math.round(settings.speechVolume * 100)}%
              </Label>
              <Slider
                value={[settings.speechVolume]}
                onValueChange={([value]) => 
                  setSettings(prev => ({ ...prev, speechVolume: value }))
                }
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
            </div>
            
            {/* Show Sources */}
            <div className="flex items-center justify-between">
              <Label htmlFor="show-sources" className="text-sm font-medium">
                Kaynakları Göster
              </Label>
              <Switch
                id="show-sources"
                checked={settings.showSources}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, showSources: checked }))
                }
              />
            </div>
            
            {/* Auto Scroll */}
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-scroll" className="text-sm font-medium">
                Otomatik Kaydırma
              </Label>
              <Switch
                id="auto-scroll"
                checked={settings.autoScroll}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, autoScroll: checked }))
                }
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Ana export bileşeni
export default function SohbetPage() {
  return (
    <ChatProvider>
      <ChatInterface />
    </ChatProvider>
  );
}