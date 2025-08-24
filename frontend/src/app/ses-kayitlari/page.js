"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Volume2, Loader2, ServerCrash, Clock, PlayCircle, ListMusic,
    Search, X, Play, Pause, Grid, List, Tag, Flame, Share2, MessageCircle
} from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import MobileOptimizedButton from '@/components/MobileOptimizedButton';
import { turkishIncludes, highlightTurkishText } from '@/utils/turkishSearch';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
function AudioPlayer({ source, title, chapters, mp3Filename, onReadyToPlay, onClose, searchQuery }) {
    const audioRef = useRef(null);
    const [activeChapter, setActiveChapter] = useState(null);
    
    // Sosyal medya paylaşım fonksiyonları
    const shareToWhatsApp = () => {
        const text = `🎧 ${title} - ${source} ses kaydını dinleyin!`;
        const url = window.location.href;
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    };
    
    const shareToFacebook = () => {
        const url = window.location.href;
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    };
    
    const shareToX = () => {
        const text = `🎧 ${title} - ${source} ses kaydını dinleyin!`;
        const url = window.location.href;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    };
    // *** YENİ: URL değiştiğinde bu efekti kullanacağız ***
    useEffect(() => {
        const audioElement = audioRef.current;
        if (audioElement) {
            // Yeni bir ses dosyası yüklendiğinde, hazır olduğunda onReadyToPlay'i çağır
            const handleCanPlay = () => {
                onReadyToPlay(audioElement);
            };
            audioElement.addEventListener('canplay', handleCanPlay);

            // Temizleme fonksiyonu
            return () => {
                audioElement.removeEventListener('canplay', handleCanPlay);
            };
        }
    }, [mp3Filename, onReadyToPlay]); // Sadece dosya adı değiştiğinde çalışır

    const jumpToTime = (timeString) => {
        const parts = timeString.split(':').map(Number);
        const seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        const audioElement = audioRef.current;
        if (audioElement && audioElement.readyState >= 3) { // readyState kontrolü
            audioElement.currentTime = seconds;
            audioElement.play().catch(e => console.error("Oynatma hatası:", e));
            setActiveChapter(timeString);
        }
    };

    const audioSrc = `${API_BASE_URL}/audio/file/${mp3Filename}`;

    return (
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col border border-slate-200/50">
            {/* Modern Header */}
            <div className="bg-gradient-to-r from-[#177267] to-[#0d9488] p-8 text-white relative flex-shrink-0">
                <MobileOptimizedButton
                    onClick={onClose}
                    className="absolute top-6 right-6 p-3 hover:bg-white/20 rounded-xl transition-all duration-200 z-10 min-h-[44px] min-w-[44px] backdrop-blur-sm"
                >
                    <X className="h-5 w-5" />
                </MobileOptimizedButton>
                <div className="pr-16">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                            <Volume2 className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold mb-2">{title.replace(/\.(mp3|wav|m4a)$/i, '').replace(/_/g, ' ')}</h2>
                            <p className="text-white/80 text-lg font-medium">{source}</p>
                        </div>
                    </div>
                    
                    {/* Sosyal Medya Paylaşım Butonları */}
                    <div className="flex items-center gap-2">
                        <span className="text-white/70 text-sm font-medium mr-2">Paylaş:</span>
                        <button
                            onClick={() => {
                                const baseUrl = window.location.origin + '/ses-kayitlari';
                                const audioId = `${source}-${mp3Filename.replace(/\.(mp3|wav|m4a)$/i, '')}`;
                                const audioUrl = `${baseUrl}?audio=${encodeURIComponent(audioId)}&autoplay=true`;
                                const text = `🎧 "${title}" ses kaydını dinleyin! - ${source}`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + audioUrl)}`, '_blank');
                            }}
                            className="p-3 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm"
                            title="WhatsApp'ta Paylaş"
                        >
                            <MessageCircle className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => {
                                const baseUrl = window.location.origin + '/ses-kayitlari';
                                const audioId = `${source}-${mp3Filename.replace(/\.(mp3|wav|m4a)$/i, '')}`;
                                const audioUrl = `${baseUrl}?audio=${encodeURIComponent(audioId)}&autoplay=true`;
                                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(audioUrl)}&quote=${encodeURIComponent(`🎧 "${title}" ses kaydını dinleyin! - ${source}`)}`, '_blank');
                            }}
                            className="p-3 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm"
                            title="Facebook'ta Paylaş"
                        >
                            <Share2 className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => {
                                const baseUrl = window.location.origin + '/ses-kayitlari';
                                const audioId = `${source}-${mp3Filename.replace(/\.(mp3|wav|m4a)$/i, '')}`;
                                const audioUrl = `${baseUrl}?audio=${encodeURIComponent(audioId)}&autoplay=true`;
                                const text = `🎧 "${title}" ses kaydını dinleyin! - ${source}`;
                                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(audioUrl)}`, '_blank');
                            }}
                            className="p-3 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm"
                            title="X'te Paylaş"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Enhanced Audio Player */}
            <div className="p-8 border-b border-slate-100 flex-shrink-0 bg-gradient-to-br from-slate-50 to-white">
                <div className="bg-gradient-to-r from-[#177267]/5 to-[#0d9488]/5 rounded-2xl p-6 border border-[#177267]/10 shadow-lg">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">Ses Oynatıcı</h3>
                        <p className="text-sm text-slate-600">Yüksek kaliteli ses deneyimi için kulaklık kullanmanızı öneririz</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-md border border-slate-200/50">
                        <audio
                            ref={audioRef}
                            src={audioSrc}
                            controls
                            className="w-full h-12 rounded-lg"
                            key={mp3Filename}
                            style={{
                                filter: 'drop-shadow(0 4px 12px rgb(23 114 103 / 0.15))',
                                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                                border: '2px solid #e2e8f0',
                                borderRadius: '12px'
                            }}
                        />
                    </div>
                </div>
            </div>
            
            {/* Modern Konu Başlıkları */}
            <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
                <div className="p-8 pb-6 flex-shrink-0 bg-white border-b border-slate-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#177267] to-[#0d9488] rounded-xl flex items-center justify-center">
                            <ListMusic className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Konu Başlıkları</h3>
                            <p className="text-sm text-slate-600">{chapters.length} konu mevcut</p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        💡 Dinlemek istediğiniz konuya tıklayarak o bölüme atlayabilirsiniz
                    </p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                    <div className="space-y-3">
                        {chapters.map((chapter, index) => (
                            <div key={index} className={`group rounded-2xl border transition-all duration-300 ${
                                activeChapter === chapter.time
                                    ? 'bg-gradient-to-r from-[#177267]/5 to-[#0d9488]/5 border-[#177267]/20 shadow-lg ring-2 ring-[#177267]/10'
                                    : 'bg-white border-slate-200 hover:bg-gradient-to-r hover:from-[#177267]/5 hover:to-[#0d9488]/5 hover:border-[#177267]/20 hover:shadow-md'
                            }`}>
                                <button
                                    onClick={() => jumpToTime(chapter.time)}
                                    className="w-full text-left p-5 transition-all duration-200 rounded-2xl"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0">
                                            <div className="w-14 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-sm group-hover:border-[#177267]/30 transition-colors">
                                                <span className="text-xs font-mono font-bold text-[#177267]">
                                                    {chapter.time}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-base font-semibold text-slate-900 leading-relaxed mb-2 group-hover:text-slate-800">
                                                {highlightSearchTerm(chapter.title, searchQuery)}
                                            </h4>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <div className={`w-2 h-2 rounded-full ${
                                                    activeChapter === chapter.time ? 'bg-[#177267] animate-pulse' : 'bg-slate-300'
                                                }`}></div>
                                                <span className="font-medium">
                                                    {activeChapter === chapter.time ? 'Şu anda oynatılıyor' : 'Bu konuya git'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                                activeChapter === chapter.time 
                                                    ? 'bg-[#177267] text-white' 
                                                    : 'bg-slate-100 text-slate-400 group-hover:bg-[#177267]/10 group-hover:text-[#177267]'
                                            }`}>
                                                <Play className="h-3.5 w-3.5" />
                                            </div>
                                        </div>
                                    </div>
                                </button>
                                <div className="px-4 pb-2 border-t border-slate-100">
                                    <div className="flex items-center justify-end">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => {
                                                    const parts = chapter.time.split(':').map(Number);
                                                    const seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
                                                    const baseUrl = window.location.origin + '/ses-kayitlari';
                                                    const audioId = `${source}-${mp3Filename.replace(/\.(mp3|wav|m4a)$/i, '')}`;
                                                    const audioUrl = `${baseUrl}?audio=${encodeURIComponent(audioId)}&time=${seconds}&autoplay=true`;
                                                    const text = `🎧 "${chapter.title}" konusunu dinleyin! (${chapter.time}) - ${title} - ${source}`;
                                                    window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + audioUrl)}`, '_blank');
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                                title="WhatsApp'ta Paylaş"
                                            >
                                                <MessageCircle className="h-3 w-3" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const parts = chapter.time.split(':').map(Number);
                                                    const seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
                                                    const baseUrl = window.location.origin + '/ses-kayitlari';
                                                    const audioId = `${source}-${mp3Filename.replace(/\.(mp3|wav|m4a)$/i, '')}`;
                                                    const audioUrl = `${baseUrl}?audio=${encodeURIComponent(audioId)}&time=${seconds}&autoplay=true`;
                                                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(audioUrl)}&quote=${encodeURIComponent(`🎧 "${chapter.title}" konusunu dinleyin! (${chapter.time}) - ${title} - ${source}`)}`, '_blank');
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                                title="Facebook'ta Paylaş"
                                            >
                                                <Share2 className="h-3 w-3" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const parts = chapter.time.split(':').map(Number);
                                                    const seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
                                                    const baseUrl = window.location.origin + '/ses-kayitlari';
                                                    const audioId = `${source}-${mp3Filename.replace(/\.(mp3|wav|m4a)$/i, '')}`;
                                                    const audioUrl = `${baseUrl}?audio=${encodeURIComponent(audioId)}&time=${seconds}&autoplay=true`;
                                                    const text = `🎧 "${chapter.title}" konusunu dinleyin! (${chapter.time}) - ${title} - ${source}`;
                                                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(audioUrl)}`, '_blank');
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                                title="X'te Paylaş"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
// Arama kelimelerini vurgulama fonksiyonu
function highlightSearchTerm(text, searchTerm) {
    return highlightTurkishText(text, searchTerm);
}

function AudioCard({ audio, source, onPlay, searchQuery }) {
    const [expanded, setExpanded] = useState(false);
    // Dosya adından temiz başlık çıkar
    const cleanTitle = audio.title.replace(/\.(mp3|wav|m4a)$/i, '').replace(/_/g, ' ');
    
    // Arama yapıldığında sadece eşleşen konuları filtrele
    const filteredChapters = useMemo(() => {
        if (!searchQuery || searchQuery.trim() === '') {
            return audio.chapters;
        }
        return audio.chapters.filter(chapter => 
            turkishIncludes(chapter.title, searchQuery.trim())
        );
    }, [audio.chapters, searchQuery]);
    
    // Gösterilecek konuları belirle
    const chaptersToShow = expanded ? filteredChapters : filteredChapters.slice(0, 3);
    
    // Belirli bir saniyeden başlatma fonksiyonu
    const handleChapterPlay = (chapter) => {
        const parts = chapter.time.split(':').map(Number);
        const seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        onPlay(audio, source, chapter.time, seconds);
    };
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative bg-white rounded-2xl border border-slate-200/60 hover:border-[#177267]/30 hover:shadow-2xl transition-all duration-500 overflow-hidden touch-manipulation backdrop-blur-sm"
        >
            {/* Modern Header */}
            <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#177267] to-[#0d9488] rounded-xl flex items-center justify-center shadow-lg">
                            <Volume2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-lg leading-tight">{cleanTitle}</h3>
                            <p className="text-sm text-slate-500 font-medium">{source}</p>
                        </div>
                    </div>
                </div>
                
                {/* Meta Info */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                        <ListMusic className="h-4 w-4 text-slate-600" />
                        <span className="text-sm font-medium text-slate-700">
                            {searchQuery ? `${filteredChapters.length}/${audio.chapters.length}` : audio.chapters.length} konu
                        </span>
                    </div>
                    {audio.duration && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                            <Clock className="h-4 w-4 text-slate-600" />
                            <span className="text-sm font-medium text-slate-700">{audio.duration}</span>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Konu Başlıkları */}
            <div className="p-6">
                <div className="mb-6">
                    <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">Konu Başlıkları</h4>
                    {filteredChapters.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-slate-500 text-sm">Arama kriterinize uygun konu bulunamadı.</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                                {chaptersToShow.map((chapter, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleChapterPlay(chapter)}
                                        className="w-full flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl hover:bg-[#177267]/5 hover:border-[#177267]/20 transition-all duration-200 group/chapter border border-transparent"
                                    >
                                        <div className="w-12 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center shadow-sm group-hover/chapter:border-[#177267]/30">
                                            <span className="text-xs font-mono font-semibold text-[#177267]">{chapter.time}</span>
                                        </div>
                                        <span 
                                            className="text-sm text-slate-700 flex-1 font-bold leading-relaxed group-hover/chapter:text-[#177267] text-left"
                                            dangerouslySetInnerHTML={{ __html: highlightSearchTerm(chapter.title, searchQuery) }}
                                        />
                                        <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center group-hover/chapter:bg-[#177267]/10 transition-colors">
                                            <Play className="h-3 w-3 text-slate-400 group-hover/chapter:text-[#177267]" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                            
                            {filteredChapters.length > 3 && (
                                <button
                                    onClick={() => setExpanded(!expanded)}
                                    className="mt-3 text-sm text-[#177267] hover:text-[#116358] font-medium transition-colors"
                                >
                                    {expanded ? 'Daha az göster' : `+${filteredChapters.length - 3} konu daha`}
                                </button>
                            )}
                        </>
                    )}
                </div>
                
                {/* Modern Play Button */}
                <button
                    onClick={() => onPlay(audio, source)}
                    className="w-full bg-gradient-to-r from-[#177267] to-[#0d9488] hover:from-[#116358] hover:to-[#0f766e] text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 hover:shadow-xl hover:shadow-[#177267]/25 hover:-translate-y-0.5 group/play touch-manipulation min-h-[44px] active:scale-95"
                    style={{
                        WebkitTapHighlightColor: 'transparent',
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'none',
                        userSelect: 'none',
                        touchAction: 'manipulation'
                    }}
                >
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center group-hover/play:bg-white/30 transition-colors">
                        <Play className="h-4 w-4 group-hover/play:scale-110 transition-transform" />
                    </div>
                    <span className="text-base">Dinlemeye Başla</span>
                </button>
            </div>
        </motion.div>
    );
}
export default function AudioLibraryPage() {
    const [audioData, setAudioData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedAudio, setSelectedAudio] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [inputQuery, setInputQuery] = useState('');
    const [viewMode] = useState('grid');
    const [limit, setLimit] = useState(12);
    const loaderRef = useRef(null);
    const { play } = useAudio();
    // *** YENİ: URL'den gelen zaman parametresini saklamak için state ***
    const [initialSeconds, setInitialSeconds] = useState(null);
    
    const handlePlayAudio = useCallback((audio, source, startTimeString = null, startSeconds = null) => {
        console.log('=== HANDLE PLAY AUDIO ===');
        console.log('Audio:', audio.title);
        console.log('StartTime:', startTimeString);
        console.log('StartSeconds:', startSeconds);
        
        let finalSeconds = startSeconds;
        if (!finalSeconds && startTimeString) {
            const parts = startTimeString.split(':').map(Number);
            finalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        
        // Sadece global mini-player üzerinden çal (modalı açma)
        play({ 
            id: `${source}-${audio.id}`, 
            title: audio.title.replace(/\.(mp3|wav|m4a)$/i, '').replace(/_/g, ' '), 
            source, 
            mp3Filename: audio.mp3_filename, 
            startSeconds: finalSeconds ?? undefined, 
            chapters: audio.chapters 
        });
    }, [play]);
    
    useEffect(() => {
        fetch(`${API_BASE_URL}/audio/all`)
            .then(res => {
                if (!res.ok) throw new Error("Ses kayıtları sunucudan alınamadı.");
                return res.json();
            })
            .then(data => {
                setAudioData(data);
                
                // URL parametrelerini kontrol et
                const urlParams = new URLSearchParams(window.location.search);
                const audioId = urlParams.get('audio');
                const timeParam = urlParams.get('time');
                const autoplay = urlParams.get('autoplay');
                
                if (audioId && autoplay === 'true') {
                    // Ses kaydını bul ve otomatik oynat
                    setTimeout(() => {
                        Object.keys(data).forEach(source => {
                            const audio = data[source].find(a => `${source}-${a.id}` === audioId);
                            if (audio) {
                                const startSeconds = timeParam ? parseInt(timeParam) : undefined;
                                handlePlayAudio(audio, source, startSeconds ? `${Math.floor(startSeconds/3600)}:${Math.floor((startSeconds%3600)/60).toString().padStart(2,'0')}:${(startSeconds%60).toString().padStart(2,'0')}` : null);
                            }
                        });
                    }, 1000);
                }
            })
            .catch(err => setError(err.message))
            .finally(() => setIsLoading(false));
    }, [handlePlayAudio]);
    // debounce search input
    useEffect(() => {
      const id = setTimeout(() => setSearchQuery(inputQuery), 300);
      return () => clearTimeout(id);
    }, [inputQuery]);

    const allAudios = useMemo(() => {
      const list = [];
      Object.keys(audioData).forEach(source => {
        audioData[source].forEach(audio => { list.push({ ...audio, source }); });
      });
      return list;
    }, [audioData]);

    const filteredAudios = useMemo(() => {
        let items = allAudios.filter(audio => {
            const matchesSearch = searchQuery === '' ||
                turkishIncludes(audio.title, searchQuery) ||
                audio.chapters.some(chapter =>
                    turkishIncludes(chapter.title, searchQuery)
                );
         
            return matchesSearch;
        });
        // En çok konu başlığına göre sırala
        items.sort((a,b) => (b.chapters?.length||0) - (a.chapters?.length||0));
        return items;
    }, [allAudios, searchQuery]);


    // infinite scroll observer
    useEffect(() => {
      if (!loaderRef.current) return;
      const observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setLimit((l) => l + 12);
        }
      }, { rootMargin: '200px' });
      observer.observe(loaderRef.current);
      return () => observer.disconnect();
    }, [loaderRef, filteredAudios.length]);

    const handleOpenDetails = (audio, source) => {
      setInitialSeconds(null);
      setSelectedAudio({ ...audio, source });
    };
    // *** YENİ: Ses dosyası oynatmaya hazır olduğunda bu fonksiyon çalışacak ***
    const handleReadyToPlay = useCallback((audioElement) => {
        if (initialSeconds !== null) {
            audioElement.currentTime = initialSeconds;
            audioElement.play().catch(e => console.error("Otomatik oynatma hatası:", e));
            setInitialSeconds(null); // Sadece bir kere çalışması için temizle
        }
    }, [initialSeconds]);
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen" style={{background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)'}}>
                <Loader2 className="h-12 w-12 animate-spin mb-4" style={{color: '#177267'}}/>
                <p className="text-gray-600">Ses kayıtları yükleniyor...</p>
            </div>
        );
    }
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen" style={{background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)'}}>
                <ServerCrash className="h-12 w-12 text-red-600 mb-4"/>
                <p className="text-red-600 text-center">{error}</p>
            </div>
        );
    }
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100/50">
            {/* Modern Header */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60">
                <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-[#177267] to-[#0d9488] rounded-2xl flex items-center justify-center shadow-lg">
                                <Volume2 className="h-8 w-8 text-white" />
                            </div>
                            <div className="text-left">
                                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight">Ses Kayıtları</h1>
                                <p className="text-lg text-slate-600 font-medium">Arşivi</p>
                            </div>
                        </div>
                        <p className="text-slate-600 text-lg">
                            <span className="text-[#177267] font-bold">{filteredAudios.length}</span> ses kaydı bulundu
                        </p>
                    </div>

                    {/* Enhanced Search Section */}
                    <div className="max-w-3xl mx-auto">
                        <div className="relative mb-6">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Konu, başlık veya kaynak ara..."
                                aria-label="Ses kaydı ara"
                                value={inputQuery}
                                onChange={(e) => setInputQuery(e.target.value)}
                                className="w-full text-base h-14 pl-12 pr-4 rounded-2xl border border-slate-200 focus:border-[#177267] focus:ring-2 focus:ring-[#177267]/10 bg-white/80 backdrop-blur-sm text-slate-700 placeholder-slate-400 transition-all duration-300 shadow-sm hover:shadow-md touch-manipulation"
                                style={{
                                    WebkitTapHighlightColor: 'transparent',
                                    WebkitTouchCallout: 'none',
                                    WebkitUserSelect: 'text',
                                    fontSize: '16px' // Prevents zoom on iOS
                                }}
                            />
                        </div>
                        
                        {/* Modern Suggestions */}
                        <div className="flex flex-wrap justify-center gap-3">
                            {["Sohbet", "Dua", "Nasihat", "İlim", "Ahlak"].map((label) => (
                                <button 
                                    key={label} 
                                    onClick={() => setInputQuery(label)} 
                                    className="px-6 py-3 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-[#177267] hover:text-white hover:border-[#177267] transition-all duration-300 touch-manipulation min-h-[44px] active:scale-95 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
                                    style={{
                                        WebkitTapHighlightColor: 'transparent',
                                        WebkitTouchCallout: 'none',
                                        WebkitUserSelect: 'none',
                                        userSelect: 'none',
                                        touchAction: 'manipulation'
                                    }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
                {filteredAudios.length === 0 ? (
                    <div className="text-center py-24">
                        <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Search className="h-12 w-12 text-slate-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-3">
                            Kayıt bulunamadı
                        </h3>
                        <p className="text-slate-600 text-lg max-w-md mx-auto">
                            Arama kriterlerinizi değiştirerek tekrar deneyin.
                        </p>
                    </div>
                ) : (
                    <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
                        {filteredAudios.slice(0, limit).map(audio => (
                            <AudioCard
                                key={`${audio.source}-${audio.id}`}
                                audio={audio}
                                source={audio.source}
                                onPlay={handlePlayAudio}
                                searchQuery={searchQuery}
                            />
                        ))}
                    </div>
                    {/* Infinite loader */}
                    <div ref={loaderRef} className="h-12 mt-8"></div>
                    </>
                )}
            </div>
            {/* Audio Player Modal */}
            <AnimatePresence>
                {selectedAudio && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={(e) => e.target === e.currentTarget && setSelectedAudio(null)}
                    >
                        <AudioPlayer
                            source={selectedAudio.source}
                            title={selectedAudio.title}
                            chapters={selectedAudio.chapters}
                            mp3Filename={selectedAudio.mp3_filename}
                            onReadyToPlay={handleReadyToPlay}
                            onClose={() => setSelectedAudio(null)}
                            searchQuery={searchQuery}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}