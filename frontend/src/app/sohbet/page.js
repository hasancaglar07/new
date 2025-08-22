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
      {/* Modern Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-emerald-700 to-green-800 rounded-lg flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-700 to-green-800 bg-clip-text text-transparent">
                    Mihmandar AI
                  </h1>
                  <p className="text-xs text-gray-500 hidden sm:block">Akıllı Sohbet Asistanı</p>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="h-10 px-4 text-gray-600 hover:text-emerald-800 hover:bg-emerald-50/70 rounded-xl transition-all duration-200 flex items-center gap-2 group"
              >
                <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                <span className="text-sm font-medium hidden sm:inline">Temizle</span>
              </Button>
              
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChatHistory(true)}
                  className="h-10 px-4 text-gray-600 hover:text-emerald-800 hover:bg-emerald-50/70 rounded-xl transition-all duration-200 flex items-center gap-2"
                >
                  <History className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">Geçmiş</span>
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="h-10 px-4 text-gray-600 hover:text-emerald-800 hover:bg-emerald-50/70 rounded-xl transition-all duration-200 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Ayarlar</span>
              </Button>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Modern Sidebar - Desktop Only */}
        {!isMobile && (
          <aside className="w-80 bg-white/80 backdrop-blur-sm border-r border-gray-200/60 shadow-lg flex flex-col">
            {/* Sidebar Header */}
            <div className="p-6 border-b border-gray-200/60">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-700 to-green-800 rounded-xl flex items-center justify-center shadow-lg">
                  <History className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Sohbet Geçmişi</h2>
                  <p className="text-sm text-gray-500">Önceki konuşmalarınız</p>
                </div>
              </div>
              
              {/* Modern Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Geçmişte ara..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all duration-200 placeholder-gray-400"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Chat History Content */}
            <div className="flex-1 overflow-hidden">
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
        
        {/* Main Chat Area - Grok Style */}
        <main className="flex-1 flex flex-col bg-gradient-to-br from-white via-emerald-50/20 to-green-50/30 relative">
        {messages.length === 0 ? (
          // Grok Style Centered Layout
          <div className="flex-1 flex flex-col justify-end items-center px-4 pb-16 pt-8">
            <div className="w-full max-w-3xl mx-auto text-center space-y-12">
              {/* Large Centered Welcome */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="space-y-6"
              >
                <div className="w-24 h-24 mx-auto bg-gradient-to-r from-emerald-700 to-green-800 rounded-full flex items-center justify-center shadow-2xl">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                
                <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                  Selamün Aleyküm! 🌹
                </h1>
                
                <p className="text-2xl md:text-3xl text-gray-600 font-light leading-relaxed">
                  Ben Mihmandar, akıllı asistanınızım.
                </p>
                
                <p className="text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto">
                  İslami ve tasavvufi konularda sorularınızı sorabilirsiniz.
                </p>
              </motion.div>
              
              {/* Large Centered Input */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="w-full max-w-4xl mx-auto"
              >
                <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl p-6">
                  <ChatInput 
                    onSendMessage={handleSendMessage}
                    disabled={isLoading}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        ) : (
          // Traditional Chat Layout
          <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-1">
          
            {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              role="log"
              aria-live="polite"
              aria-label="Sohbet mesajları"
              className="space-y-4 mb-2 overflow-y-auto flex-1"
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
            
            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <div className="relative mb-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
                    className="relative w-16 h-16 flex items-center justify-center"
                  >
                    <Image 
                      src="/logo-top.svg" 
                      alt="Mihmandar" 
                      width={64}
                      height={64}
                      className="w-16 h-16"
                    />
                  </motion.div>
                </div>
                
                <div className="text-center space-y-4 max-w-2xl mx-auto">
                  <motion.p
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-emerald-800 font-medium text-lg"
                  >
                    Düşünüyor ve araştırıyor...
                  </motion.p>
                  
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="h-1 bg-gradient-to-r from-emerald-700 to-green-800 rounded-full mx-auto max-w-xs"
                  />
                  
                  <motion.div
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="bg-emerald-50/80 backdrop-blur-sm rounded-xl p-4 border border-emerald-200/50"
                  >
                    <div className="text-emerald-800 text-sm font-medium mb-2">Bilgi Hazırlanıyor...</div>
                    <div className="text-emerald-700 text-xs italic leading-relaxed">
                      &ldquo;İlim öğrenmek her Müslüman erkek ve kadına farzdır.&rdquo; 
                      <span className="block mt-1 text-emerald-600 font-medium">- Hz. Muhammed (s.a.v)</span>
                    </div>
                  </motion.div>
                  
                  <motion.p
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-emerald-700 text-sm"
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
          
            {/* Input Area for Chat Mode */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-2 pb-2">
              <ChatInput 
                onSendMessage={handleSendMessage}
                disabled={isLoading}
              />
            </div>
          </div>
        )}
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