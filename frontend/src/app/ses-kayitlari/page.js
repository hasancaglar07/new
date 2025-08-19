"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Volume2, Loader2, ServerCrash, Clock, PlayCircle, ListMusic,
    Search, X, Play, Pause, Grid, List, Tag, Flame, Share2, MessageCircle
} from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import MobileOptimizedButton from '@/components/MobileOptimizedButton';
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
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white relative flex-shrink-0" style={{background: 'linear-gradient(to right, #177267, #0d9488)'}}>
                <MobileOptimizedButton
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors z-10 min-h-[44px] min-w-[44px]"
                >
                    <X className="h-5 w-5" />
                </MobileOptimizedButton>
                <div className="pr-12">
                    <h2 className="text-2xl font-bold mb-4">Kaynak: {source}</h2>
                    
                    {/* Sosyal Medya Paylaşım Butonları */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => {
                                const baseUrl = window.location.origin + '/ses-kayitlari';
                                const audioId = `${source}-${mp3Filename.replace(/\.(mp3|wav|m4a)$/i, '')}`;
                                const audioUrl = `${baseUrl}?audio=${encodeURIComponent(audioId)}&autoplay=true`;
                                const text = `🎧 "${title}" ses kaydını dinleyin! - ${source}`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + audioUrl)}`, '_blank');
                            }}
                            className="p-2 text-emerald-200 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                            title="WhatsApp'ta Paylaş"
                        >
                            <MessageCircle className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => {
                                const baseUrl = window.location.origin + '/ses-kayitlari';
                                const audioId = `${source}-${mp3Filename.replace(/\.(mp3|wav|m4a)$/i, '')}`;
                                const audioUrl = `${baseUrl}?audio=${encodeURIComponent(audioId)}&autoplay=true`;
                                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(audioUrl)}&quote=${encodeURIComponent(`🎧 "${title}" ses kaydını dinleyin! - ${source}`)}`, '_blank');
                            }}
                            className="p-2 text-emerald-200 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                            title="Facebook'ta Paylaş"
                        >
                            <Share2 className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => {
                                const baseUrl = window.location.origin + '/ses-kayitlari';
                                const audioId = `${source}-${mp3Filename.replace(/\.(mp3|wav|m4a)$/i, '')}`;
                                const audioUrl = `${baseUrl}?audio=${encodeURIComponent(audioId)}&autoplay=true`;
                                const text = `🎧 "${title}" ses kaydını dinleyin! - ${source}`;
                                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(audioUrl)}`, '_blank');
                            }}
                            className="p-2 text-emerald-200 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                            title="X'te Paylaş"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Audio Player - Büyük */}
            <div className="p-8 border-b border-slate-200 flex-shrink-0 bg-gradient-to-r from-slate-50 to-slate-100">
                <div className="bg-white rounded-xl p-4 shadow-md border border-slate-200">
                    <audio
                        ref={audioRef}
                        src={audioSrc}
                        controls
                        className="w-full h-16 rounded-lg"
                        key={mp3Filename}
                        style={{
                            filter: 'drop-shadow(0 4px 6px rgb(0 0 0 / 0.1))',
                            transform: 'scale(1.05)'
                        }}
                    />
                </div>
            </div>
            
            {/* Konu Başlıkları - Aşağı Doğru Seçilebilir */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="p-6 pb-4 flex-shrink-0">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <ListMusic className="h-6 w-6 text-[#177267]" />
                        Konu Başlıkları
                        <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                            {chapters.length} konu
                        </span>
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">Dinlemek istediğiniz konuya tıklayın</p>
                </div>
                
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                    <div className="space-y-3">
                        {chapters.map((chapter, index) => (
                            <div key={index} className={`w-full rounded-xl border transition-all duration-200 ${
                                activeChapter === chapter.time
                                    ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300 shadow-lg ring-2 ring-emerald-200'
                                    : 'bg-slate-50 border-slate-200 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 hover:border-emerald-300'
                            }`}>
                                <button
                                    onClick={() => jumpToTime(chapter.time)}
                                    className="w-full text-left p-4 hover:bg-emerald-50/50 transition-colors rounded-t-xl"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0">
                                            <span className="inline-flex items-center justify-center w-12 h-8 text-xs font-mono font-bold text-[#177267] bg-white rounded-lg border-2 border-emerald-300 shadow-sm">
                                                {chapter.time}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-base font-semibold text-slate-900 leading-relaxed mb-1">
                                                {highlightSearchTerm(chapter.title, searchQuery)}
                                            </h4>
                                            <div className="flex items-center gap-2 text-xs text-emerald-600">
                                                <Play className="h-3.5 w-3.5" />
                                                <span className="font-medium">
                                                    {activeChapter === chapter.time ? 'Şu anda oynatılıyor' : 'Bu konuya git'}
                                                </span>
                                            </div>
                                        </div>
                                        {activeChapter === chapter.time && (
                                            <div className="flex-shrink-0">
                                                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                                            </div>
                                        )}
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
    if (!searchTerm || searchTerm.trim() === '') return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
        if (regex.test(part)) {
            return <strong key={index} className="bg-yellow-200 text-yellow-900 px-0.5 rounded">{part}</strong>;
        }
        return part;
    });
}

function AudioCard({ audio, source, onPlay, searchQuery }) {
    const [expanded, setExpanded] = useState(false);
    // Dosya adından temiz başlık çıkar
    const cleanTitle = audio.title.replace(/\.(mp3|wav|m4a)$/i, '').replace(/_/g, ' ');
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all duration-300 overflow-hidden"
        >
            {/* Header - Sadece meta bilgiler */}
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#177267] text-white text-sm font-semibold shadow-sm">
                        <Tag className="h-4 w-4 mr-2" />
                        {source}
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-emerald-200 text-[#177267] font-semibold shadow-sm">
                          <ListMusic className="h-4 w-4" />
                          {audio.chapters.length} konu
                        </span>
                        {audio.duration && (
                          <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 font-medium shadow-sm">
                            <Clock className="h-4 w-4" />
                            {audio.duration}
                          </span>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Konu Başlıkları - Ana İçerik */}
            <div className="p-5">
                <div className="mb-4">
                    <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <div className="w-1 h-6 bg-[#177267] rounded-full"></div>
                        Konu Başlıkları
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {audio.chapters.map((chapter, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200 hover:border-emerald-300 transition-colors">
                                <span className="text-xs text-[#177267] font-mono bg-white px-2 py-1 rounded border border-emerald-300 shrink-0 font-semibold">
                                    {chapter.time}
                                </span>
                                <span className="text-sm text-slate-800 flex-1 font-medium leading-relaxed">
                                    {highlightSearchTerm(chapter.title, searchQuery)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Büyük Play Button */}
                <button
                    onClick={() => onPlay(audio, source)}
                    className="w-full bg-gradient-to-r from-[#177267] to-[#0d9488] hover:from-[#116358] hover:to-[#0f766e] text-white font-bold py-6 px-8 rounded-xl flex items-center justify-center gap-4 transition-all duration-300 hover:shadow-xl hover:scale-[1.03] group"
                >
                    <Play className="h-8 w-8 group-hover:scale-110 transition-transform" />
                    <span className="text-xl">Dinlemeye Başla</span>
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
    
    const handlePlayAudio = useCallback((audio, source, startTimeString = null) => {
        console.log('=== HANDLE PLAY AUDIO ===');
        console.log('Audio:', audio.title);
        console.log('StartTime:', startTimeString);
        let seconds = null;
        if (startTimeString) {
            const parts = startTimeString.split(':').map(Number);
            seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        // Sadece global mini-player üzerinden çal (modalı açma)
        play({ id: `${source}-${audio.id}`, title: audio.title.replace(/\.(mp3|wav|m4a)$/i, '').replace(/_/g, ' '), source, mp3Filename: audio.mp3_filename, startSeconds: seconds ?? undefined, chapters: audio.chapters });
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
                audio.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                audio.chapters.some(chapter =>
                    chapter.title.toLowerCase().includes(searchQuery.toLowerCase())
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center mb-6">
                        <h1 className="text-4xl lg:text-5xl font-bold text-[#177267]">Ses Kayıtları Arşivi</h1>
                        <p className="mt-3 text-base text-slate-600">
                            <span className="text-[#177267] font-semibold">{filteredAudios.length}</span> ses kaydı bulundu
                        </p>
                    </div>

                    {/* Search Section */}
                    <div className="max-w-2xl mx-auto">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Konu, başlık veya kaynak ara..."
                                aria-label="Ses kaydı ara"
                                value={inputQuery}
                                onChange={(e) => setInputQuery(e.target.value)}
                                className="w-full text-base md:text-lg h-14 pl-4 pr-4 rounded-lg border border-slate-300 focus:border-[#177267] focus:ring-2 focus:ring-[#177267]/20 bg-white text-slate-700 placeholder-slate-400 transition-all duration-200 shadow-sm"
                            />
                        </div>
                        
                        {/* Suggestions */}
                        <div className="flex flex-wrap justify-center gap-2 mt-4">
                            {["Sohbet", "Dua", "Nasihat", "İlim", "Ahlak"].map((label) => (
                                <button 
                                    key={label} 
                                    onClick={() => setInputQuery(label)} 
                                    className="px-4 py-2 text-sm rounded-full border border-slate-300 text-[#177267] hover:bg-[#177267] hover:text-white transition-colors duration-200"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8">
                {filteredAudios.length === 0 ? (
                    <div className="text-center py-20">
                        <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">
                            Kayıt bulunamadı
                        </h3>
                        <p className="text-gray-600">
                            Arama kriterlerinizi değiştirerek tekrar deneyin.
                        </p>
                    </div>
                ) : (
                    <>
                    <div className={
                        viewMode === 'grid'
                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6"
                            : "space-y-4"
                    }>
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
                    <div ref={loaderRef} className="h-8"></div>
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