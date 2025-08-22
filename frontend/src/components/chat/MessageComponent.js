"use client";

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Volume2, 
  VolumeX, 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  ExternalLink,
  BookOpen,
  FileText,
  Music,
  Video,
  Sparkles,
  User,
  AlertCircle,
  CheckCircle2,
  MoreHorizontal,
  Share2,
  Loader2
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';

// Chat context and hooks
import { useChat, MESSAGE_TYPES, SOURCE_TYPES } from './ChatProvider';
import { useGoogleTTS } from './useGoogleTTS';
import TypewriterText from './TypewriterText';

// Düşünme animasyonu bileşeni
const ThinkingAnimation = ({ text }) => {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-gray-400 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2
            }}
          />
        ))}
      </div>
      <motion.span 
        className="text-gray-600 text-sm font-medium italic"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {text}
      </motion.span>
    </div>
  );
};

// Modern kaynak kartı bileşeni
const SourceCard = ({ source, index, onSourceClick }) => {
  const getSourceIcon = (type) => {
    switch (type) {
      case SOURCE_TYPES.BOOK: return <BookOpen className="w-3 h-3" />;
      case SOURCE_TYPES.ARTICLE: return <FileText className="w-3 h-3" />;
      case SOURCE_TYPES.AUDIO: return <Music className="w-3 h-3" />;
      case SOURCE_TYPES.VIDEO: return <Video className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  const getSourceBadge = (type) => {
    switch (type) {
      case SOURCE_TYPES.BOOK: return { label: 'Kitap', color: 'bg-blue-100 text-blue-700' };
      case SOURCE_TYPES.ARTICLE: return { label: 'Makale', color: 'bg-gray-100 text-gray-700' };
      case SOURCE_TYPES.AUDIO: return { label: 'Ses', color: 'bg-purple-100 text-purple-700' };
      case SOURCE_TYPES.VIDEO: return { label: 'Video', color: 'bg-red-100 text-red-700' };
      default: return { label: 'Kaynak', color: 'bg-gray-100 text-gray-700' };
    }
  };

  const handleClick = () => {
    if (onSourceClick && source) {
      onSourceClick(source);
    }
  };

  const badge = getSourceBadge(source.type);

  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="group cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all duration-200">
        {/* Üst satır - Mobilde tek satır */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Kaynak numarası */}
          <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-gray-600">{index}</span>
          </div>
          
          {/* Kaynak ikonu */}
          <div className="flex-shrink-0 text-gray-500">
            {getSourceIcon(source.type)}
          </div>
          
          {/* Kaynak bilgileri */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <h4 className="font-medium text-gray-900 text-sm line-clamp-2 sm:truncate group-hover:text-gray-700 transition-colors">
                {source.title || 'Başlıksız Kaynak'}
              </h4>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.color} flex-shrink-0 self-start sm:self-center`}>
                {badge.label}
              </span>
            </div>
            
            {source.author && (
              <p className="text-xs text-gray-500 mt-1 sm:mt-0 line-clamp-1">
                {source.author}
                {source.relevance && (
                  <span className="hidden sm:inline ml-2 text-gray-400">• {source.relevance}</span>
                )}
              </p>
            )}
          </div>
          
          {/* Açma ikonu */}
          {source.url && (
            <div className="flex-shrink-0">
              <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Gelişmiş metin formatlaması ve referans işleme
const renderContentWithClickableReferences = (content, sources, onSourceClick) => {
  if (!content) return '';
  
  // Metni paragraflar halinde böl
  const paragraphs = content.split('\n\n').filter(p => p.trim());
  
  return paragraphs.map((paragraph, pIndex) => {
    // Her paragrafı işle
    let processedParagraph = paragraph;
    
    // **Bold** formatını işle
    processedParagraph = processedParagraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Referans numaralarını işle
    if (sources && sources.length > 0) {
      const parts = processedParagraph.split(/(\[\d+\])/);
      
      const renderedParts = parts.map((part, index) => {
        const match = part.match(/\[(\d+)\]/);
        if (match) {
          const refNumber = parseInt(match[1]);
          const source = sources[refNumber - 1];
          
          if (source) {
            return (
              <span
                key={`${pIndex}-${index}`}
                onClick={() => onSourceClick?.(source)}
                className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full cursor-pointer hover:bg-gray-200 transition-colors mx-0.5"
                title={`${source.title} - Tıklayın`}
              >
                {refNumber}
              </span>
            );
          }
        }
        // HTML içeriğini güvenli şekilde render et
        return <span key={`${pIndex}-${index}`} dangerouslySetInnerHTML={{ __html: part }} />;
      });
      
      return (
        <p key={pIndex} className="mb-4 last:mb-0">
          {renderedParts}
        </p>
      );
    }
    
    return (
      <p key={pIndex} className="mb-4 last:mb-0" dangerouslySetInnerHTML={{ __html: processedParagraph }} />
    );
  });
};

// Ana mesaj bileşeni
export default function MessageComponent({ message, onSourceClick, onFeedback }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Prevent hydration mismatch for time display
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  // Google TTS hook
  const {
    isSpeaking,
    isLoading: isTTSLoading,
    error: ttsError,
    speak,
    stop: stopSpeaking,
    toggle: toggleSpeaking
  } = useGoogleTTS();
  
  // Always allow speech (fallback to browser TTS)
  const canSpeak = true;
  
  const isUser = message.type === MESSAGE_TYPES.USER;
  const isSystem = message.type === MESSAGE_TYPES.SYSTEM;
  const isAssistant = message.type === MESSAGE_TYPES.ASSISTANT;
  
  // Metni kopyala
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Kopyalama hatası:', error);
    }
  }, [message.content]);
  
  // Fallback to Web Speech API
  const fallbackToWebSpeech = useCallback((text) => {
    if ('speechSynthesis' in window) {
      // Stop any ongoing speech first
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'tr-TR';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  }, []);
  
  // Metni sesli okuma (Google TTS)
  const handleSpeak = useCallback(async () => {
    if (isSpeaking) {
      // Stop both Google TTS and browser TTS
      stopSpeaking();
      
      // Also stop browser speech synthesis
      if ('speechSynthesis' in window && speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      return;
    }
    
    try {
      // Stop any ongoing browser speech first
      if ('speechSynthesis' in window && speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      
      // Clean text for better TTS
      const cleanText = message.content
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
        .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
        .replace(/\[(\d+)\]/g, '') // Remove reference numbers
        .replace(/\n\n+/g, '. ') // Replace multiple newlines with periods
        .replace(/\n/g, ' ') // Replace single newlines with spaces
        .trim();
      
      if (!cleanText) {
        return;
      }
      
      await speak(cleanText, {
        onComplete: () => {
          console.log('TTS completed');
        },
        onError: (error) => {
          console.error('TTS error:', error);
          // Fallback to browser TTS
          fallbackToWebSpeech(cleanText);
        }
      });
    } catch (error) {
      console.error('TTS error:', error);
      // Fallback to browser TTS
      fallbackToWebSpeech(message.content);
    }
  }, [message.content, isSpeaking, speak, stopSpeaking, fallbackToWebSpeech]);
  
  // Geri bildirim
  const handleFeedback = useCallback((type) => {
    setFeedback(type);
    onFeedback?.(message.id, type);
  }, [message.id, onFeedback]);
  
  // Paylaş
  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mihmandar Asistanı Cevabı',
          text: message.content,
          url: window.location.href
        });
      } catch (error) {
        console.log('Paylaşım iptal edildi');
      }
    } else {
      // Fallback: URL'yi kopyala
      handleCopy();
    }
  }, [message.content, handleCopy]);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`mb-6 ${isUser ? 'flex justify-end' : ''}`}
    >
      <div className={`${isUser ? 'max-w-md' : 'w-full'}`}>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 20,
            delay: 0.1 
          }}
          className="relative"
        >
          {/* Modern Message Container */}
          <div className={`relative ${
             isUser 
               ? 'bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm text-gray-900 p-4' 
               : 'bg-white border border-gray-100 rounded-2xl shadow-sm p-4'
           }`}
        >
          {/* Message Content */}
          <div className={isUser ? '' : ''}>
            <div className="flex items-start gap-4">
              {/* Avatar - Only for AI messages */}
              {!isUser && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-emerald-100 border-2 border-emerald-200 shadow-sm"
                >
                  <img 
                    src="/logo-top.svg" 
                    alt="Mihmandar AI" 
                    className="w-6 h-6 object-contain"
                  />
                </motion.div>
              )}
              
              {/* User Avatar - Inside the white frame */}
              {isUser && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="flex-shrink-0 w-10 h-10 bg-emerald-200 rounded-full flex items-center justify-center"
                >
                  <User className="w-5 h-5 text-emerald-700" />
                </motion.div>
              )}
              
              <div className="flex-1 min-w-0">
                {/* Mesaj içeriği */}
                <div className="prose prose-lg max-w-none">
                  {/* Normal mesaj içeriği */}
                  <div className={`leading-7 text-base ${
                      isUser ? 'text-gray-900 whitespace-pre-wrap' : 'text-gray-900'
                    }`}>
                    {renderContentWithClickableReferences(message.content, message.sources, onSourceClick)}
                  </div>
                </div>
                  
                  {/* Kaynak kartları - Modern tasarım */}
                   {message.sources && message.sources.length > 0 && (
                     <motion.div 
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ delay: 0.4 }}
                       className="mt-6"
                     >
                       {/* Başlık */}
                       <div className="flex items-center gap-2 mb-4">
                         <div className="w-1 h-4 bg-gray-300 rounded-full"></div>
                         <h3 className="text-sm font-medium text-gray-700">
                           Kaynaklar ({message.sources.length})
                         </h3>
                       </div>
                       
                       {/* Kaynak listesi - Mobil uyumlu grid */}
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
                         {message.sources.map((source, index) => {
                           const uniqueKey = `source-${message.id || Date.now()}-${index}-${source.id || source.title?.slice(0, 10) || source.url?.slice(-10) || Math.random().toString(36).substr(2, 9)}`;
                           return (
                             <motion.div
                               key={uniqueKey}
                               initial={{ opacity: 0, x: -10 }}
                               animate={{ opacity: 1, x: 0 }}
                               transition={{ delay: 0.5 + index * 0.05 }}
                               className="w-full"
                             >
                               <SourceCard 
                                 source={source} 
                                 index={index + 1}
                                 onSourceClick={onSourceClick}
                               />
                             </motion.div>
                           );
                         })}
                       </div>
                     </motion.div>
                   )}
                </div>
              </div>
            </div>
            
            {/* Mesaj aksiyonları */}
            {!isUser && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="px-6 pb-6"
              >
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200/50 to-transparent mb-4" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSpeak}
                      disabled={!canSpeak && !isSpeaking}
                      className={`h-9 px-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-200 ${
                         isTTSLoading ? 'opacity-50' : ''
                       } ${
                         ttsError ? 'bg-red-100 text-red-600 hover:bg-red-200' : ''
                       }`}
                      title={
                        isTTSLoading 
                          ? "Ses hazırlanıyor..."
                          : isSpeaking 
                            ? "Durdurmak için tıklayın" 
                            : ttsError
                              ? "TTS hatası - tekrar deneyin"
                              : "Sesli okumak için tıklayın"
                      }
                    >
                      {isTTSLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isSpeaking ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-9 px-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-200"
                      title="Kopyala"
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4 text-gray-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleShare}
                      className="h-9 px-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-200"
                      title="Paylaş"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Geri bildirim butonları */}
                  {isAssistant && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback('positive')}
                        className={`h-9 px-3 rounded-full transition-all duration-200 ${
                          feedback === 'positive' 
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-700'
                        }`}
                        title="Yararlı"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback('negative')}
                        className={`h-9 px-3 rounded-full transition-all duration-200 ${
                          feedback === 'negative' 
                            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                            : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700'
                        }`}
                        title="Yararlı değil"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </Button>
                      
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all duration-200"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2 bg-white border border-gray-200 shadow-lg">
                          <div className="space-y-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start h-8 text-gray-700 hover:bg-gray-100"
                              onClick={() => console.log('Rapor et')}
                            >
                              Rapor Et
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start h-8 text-gray-700 hover:bg-gray-100"
                              onClick={() => console.log('Yeniden oluştur')}
                            >
                              Yeniden Oluştur
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
                
                {/* Zaman damgası */}
                <div className="flex justify-between items-center mt-4 text-xs text-gray-600/70">
                  <span className="font-medium">
                    {isHydrated ? (() => {
                      const timestamp = message.timestamp instanceof Date 
                        ? message.timestamp 
                        : new Date(message.timestamp);
                      return timestamp.toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    })() : '--:--'}
                  </span>
                  {copied && (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-gray-600 font-medium bg-gray-100 px-2 py-1 rounded-full"
                    >
                      Kopyalandı!
                    </motion.span>
                  )}
                </div>
              </motion.div>
            )}
            
            {/* Kullanıcı mesajı için zaman damgası */}
             {isUser && (
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ delay: 0.3 }}
                 className="px-6 pb-4"
               >
                 <div className="text-xs text-gray-500 text-right font-medium">
                   {isHydrated ? (() => {
                     const timestamp = message.timestamp instanceof Date 
                       ? message.timestamp 
                       : new Date(message.timestamp);
                     return timestamp.toLocaleTimeString('tr-TR', {
                       hour: '2-digit',
                       minute: '2-digit'
                     });
                   })() : '--:--'}
                 </div>
               </motion.div>
             )}
          </div>
         </motion.div>
      </div>
    </motion.div>
  );
}