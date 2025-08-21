"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
      
      // Call backend API
      const response = await fetch('http://localhost:8000/chat/advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          session_id: `session_${Date.now()}`,
          use_vector_search: true,
          max_sources: 12,
          temperature: 0.4,
          max_tokens: 4000,
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
          content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
          sources: []
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      addMessage({
        type: 'assistant',
        content: 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.',
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center">
              {/* Logo area removed for cleaner design */}
            </div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="h-9 px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Temizle</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChatHistory(true)}
                className="h-9 px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Geçmiş</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="h-9 px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Ayarlar</span>
              </Button>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className={`flex-1 flex flex-col h-screen bg-gradient-to-br from-emerald-50/30 via-teal-50/20 to-green-50/30 ${typeof window !== 'undefined' && !isMobile ? 'ml-80' : ''}`}>
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-2">
          {/* Messages Area */}
          <div 
            ref={messagesContainerRef}
            role="log"
            aria-live="polite"
            aria-label="Sohbet mesajları"
            className="flex-1 space-y-6 mb-6 overflow-y-auto"
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
                <div className="relative mb-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 relative"
                  >
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.4, 1, 0.4],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.2,
                          ease: "easeInOut"
                        }}
                        className="absolute w-3 h-3 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full"
                        style={{
                          left: `${50 + 35 * Math.cos((i * Math.PI) / 4)}%`,
                          top: `${50 + 35 * Math.sin((i * Math.PI) / 4)}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      />
                    ))}
                  </motion.div>
                </div>
                
                <div className="text-center space-y-3">
                  <motion.p
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-emerald-700 font-medium text-lg"
                  >
                    Düşünüyor ve araştırıyor...
                  </motion.p>
                  
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="h-1 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full mx-auto max-w-xs"
                  />
                  
                  <motion.p
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-emerald-600 text-sm"
                  >
                    Kaynaklardan bilgi topluyorum...
                  </motion.p>
                </div>
              </motion.div>
            )}
            
            {/* Chat History Sidebar */}
            {typeof window !== 'undefined' && (
              <React.Fragment>
                {!isMobile && (
                  <div className="fixed left-0 top-12 h-[calc(100vh-3rem)] w-80 bg-white border-r border-gray-200 shadow-lg z-40">
                    <div className="p-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-3">
                        <History className="w-5 h-5" />
                        Sohbet Geçmişi
                      </h2>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Geçmişte ara..."
                          value={historySearchQuery}
                          onChange={(e) => setHistorySearchQuery(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="absolute right-3 top-2.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
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
                )}
                
                {isMobile && showChatHistory && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowChatHistory(false)}>
                    <div className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl transform transition-transform duration-300" onClick={(e) => e.stopPropagation()}>
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <History className="w-5 h-5" />
                            Sohbet Geçmişi
                          </h2>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowChatHistory(false)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X className="w-5 h-5" />
                          </Button>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Geçmişte ara..."
                            value={historySearchQuery}
                            onChange={(e) => setHistorySearchQuery(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <div className="absolute right-3 top-2.5">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                        </div>
                      </div>
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
                  </div>
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
                className="fixed bottom-20 right-6 z-30"
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
          
          {/* Input Area */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-4 pb-4">
            <ChatInput 
              onSendMessage={handleSendMessage}
              disabled={isLoading}
            />
          </div>
        </div>
      </main>
      
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