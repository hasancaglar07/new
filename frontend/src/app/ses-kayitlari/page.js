"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Volume2, Loader2, ServerCrash, Clock, PlayCircle, ListMusic,
    Search, X, Play, Pause, Grid, List, Tag, Flame, Share2, MessageCircle
} from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
function AudioPlayer({ source, title, chapters, mp3Filename, onReadyToPlay, onClose }) {
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
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors z-10"
                >
                    <X className="h-5 w-5" />
                </button>
                <div className="pr-12">
                    <h2 className="text-2xl font-bold mb-2">{title}</h2>
                    <p className="text-emerald-100 mb-4">Kaynak: {source}</p>
                    
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
            
            {/* Audio Player */}
            <div className="p-6 border-b border-slate-200 flex-shrink-0">
                <audio
                    ref={audioRef}
                    src={audioSrc}
                    controls
                    className="w-full h-12 rounded-lg"
                    key={mp3Filename}
                />
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
                                                {chapter.title}
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
function AudioCard({ audio, source, onPlay }) {
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
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {audio.chapters.slice(0, expanded ? audio.chapters.length : 4).map((chapter, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200 hover:border-emerald-300 transition-colors">
                                <span className="text-xs text-[#177267] font-mono bg-white px-2 py-1 rounded border border-emerald-300 shrink-0 font-semibold">
                                    {chapter.time}
                                </span>
                                <span className="text-sm text-slate-800 flex-1 font-medium leading-relaxed">{chapter.title}</span>
                            </div>
                        ))}
                        {audio.chapters.length > 4 && (
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="text-sm text-[#177267] hover:text-[#116358] font-semibold flex items-center gap-1 mt-3 w-full justify-center py-2 bg-emerald-50 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
                            >
                                {expanded ? 'Daha az göster' : `+${audio.chapters.length - 4} konu daha göster`}
                            </button>
                        )}
                    </div>
                </div>
                
                {/* Şık Play Button */}
                <button
                    onClick={() => onPlay(audio, source)}
                    className="w-full bg-gradient-to-r from-[#177267] to-[#0d9488] hover:from-[#116358] hover:to-[#0f766e] text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] group"
                >
                    <Play className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    <span className="text-lg">Dinlemeye Başla</span>
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
    const [selectedSource, setSelectedSource] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    const [sortBy, setSortBy] = useState('topics');
    const [limit, setLimit] = useState(12);
    const loaderRef = useRef(null);
    const { play } = useAudio();
    // *** YENİ: URL'den gelen zaman parametresini saklamak için state ***
    const [initialSeconds, setInitialSeconds] = useState(null);
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
    }, []);
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
         
            const matchesSource = selectedSource === 'all' || audio.source === selectedSource;
         
            return matchesSearch && matchesSource;
        });
        // sort
        items.sort((a,b)=>{
          if (sortBy === 'newest') return (b.created_at||0) - (a.created_at||0);
          if (sortBy === 'oldest') return (a.created_at||0) - (b.created_at||0);
          if (sortBy === 'az') return a.title.localeCompare(b.title);
          if (sortBy === 'za') return b.title.localeCompare(a.title);
          if (sortBy === 'topics') return (b.chapters?.length||0) - (a.chapters?.length||0);
          return 0;
        });
        return items;
    }, [allAudios, searchQuery, selectedSource, sortBy]);


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
    const handlePlayAudio = (audio, source, startTimeString = null) => {
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
    };

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

                    {/* Filter toolbelt */}
                    <div className="w-full bg-white border border-slate-200 rounded-xl p-4">
                        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
                            {/* Search */}
                            <div className="relative flex-1 lg:max-w-md">
                                <input
                                    type="text"
                                    placeholder="Başlık veya konu ara..."
                                    aria-label="Ses kaydı ara"
                                    value={inputQuery}
                                    onChange={(e) => setInputQuery(e.target.value)}
                                    className="w-full pl-4 pr-4 py-3 border border-slate-300 rounded-lg focus:border-[#177267] focus:ring-0 bg-white text-slate-700 placeholder-slate-400"
                                />
                            </div>
                            {/* Source Filter */}
                            <div className="relative">
                                <select
                                    value={selectedSource}
                                    onChange={(e) => setSelectedSource(e.target.value)}
                                    className="appearance-none px-5 py-3 pr-9 border border-slate-300 rounded-lg focus:border-[#177267] focus:ring-0 bg-white text-slate-700 min-w-48"
                                >
                                    <option value="all">Tüm Kaynaklar</option>
                                    {Object.keys(audioData).map(source => (
                                        <option key={source} value={source}>{source}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <div className="w-2 h-2 border-r-2 border-b-2 border-[#177267] rotate-45"></div>
                                </div>
                            </div>
                            {/* Sort */}
                            <div className="relative">
                              <select value={sortBy} onChange={(e)=> setSortBy(e.target.value)} className="appearance-none px-5 py-3 pr-9 border border-slate-300 rounded-lg focus:border-[#177267] focus:ring-0 bg-white text-slate-700 min-w-48">
                                <option value="newest">En Yeni</option>
                                <option value="oldest">En Eski</option>
                                <option value="az">A–Z</option>
                                <option value="za">Z–A</option>
                                <option value="topics">Konu Sayısı</option>
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <div className="w-2 h-2 border-r-2 border-b-2 border-[#177267] rotate-45"></div>
                              </div>
                            </div>
                            {/* View toggle */}
                            <div className="flex rounded-lg border border-slate-300 overflow-hidden bg-white">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`px-4 py-3 ${viewMode==='grid' ? 'bg-[#177267] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <Grid className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-4 py-3 ${viewMode==='list' ? 'bg-[#177267] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <List className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        {/* Suggestions */}
                        <div className="flex flex-wrap gap-2 mt-3">
                            {["Sohbet", "Dua", "Nasihat", "İlim", "Ahlak"].map((label) => (
                                <button key={label} onClick={() => setSearchQuery(label)} className="px-3 py-1.5 text-sm rounded-full border border-slate-300 text-[#177267] hover:bg-slate-50">
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
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}