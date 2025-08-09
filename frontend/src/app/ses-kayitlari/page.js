"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Volume2, Loader2, ServerCrash, Clock, PlayCircle, ListMusic,
    Search, X, Play, Pause, Grid, List, Tag
} from 'lucide-react';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
function AudioPlayer({ source, title, chapters, mp3Filename, onReadyToPlay, onClose }) {
    const audioRef = useRef(null);
    const [activeChapter, setActiveChapter] = useState(null);
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
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white relative" style={{background: 'linear-gradient(to right, #177267, #0d9488)'}}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
                <h2 className="text-2xl font-bold mb-2 pr-12">{title}</h2>
                <p className="text-emerald-100">Kaynak: {source}</p>
            </div>
            <div className="p-6">
                <audio
                    ref={audioRef}
                    src={audioSrc}
                    controls
                    className="w-full mb-6"
                    key={mp3Filename}
                />
                {/* Chapters */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {chapters.map((chapter, index) => (
                        <button
                            key={index}
                            onClick={() => jumpToTime(chapter.time)}
                            className={`p-4 rounded-lg border transition-all text-left hover:shadow-sm ${
                                activeChapter === chapter.time
                                    ? 'bg-emerald-50'
                                    : 'border-gray-200 hover:bg-gray-50'
                            }`}
                            style={{
                                borderColor: activeChapter === chapter.time ? '#177267' : undefined,
                                backgroundColor: activeChapter === chapter.time ? '#f0fdf4' : undefined
                            }}
                            onMouseEnter={(e) => {
                                if (activeChapter !== chapter.time) {
                                    e.target.style.borderColor = '#34d399';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeChapter !== chapter.time) {
                                    e.target.style.borderColor = '#e5e7eb';
                                }
                            }}
                        >
                            <div className="flex items-start gap-3">
                                <PlayCircle className="h-5 w-5 mt-0.5 shrink-0" style={{color: '#177267'}} />
                                <div className="min-w-0">
                                    <span className="font-semibold text-sm" style={{color: '#177267'}}>
                                        {chapter.time}
                                    </span>
                                    <p className="text-gray-700 text-base font-medium leading-relaxed mt-1">
                                        {chapter.title}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
function AudioCard({ audio, source, onPlay }) {
    // Dosya adından temiz başlık çıkar
    const cleanTitle = audio.title.replace(/\.(mp3|wav|m4a)$/i, '').replace(/_/g, ' ');
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all duration-300 overflow-hidden"
        >
            {/* Header - corporate */}
            <div className="p-6 border-b border-slate-200 bg-white">
                <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#177267] text-white text-sm font-semibold">
                        <Tag className="h-4 w-4 mr-2" />
                        {source}
                    </span>
                    <span className="text-sm text-[#177267] flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-full border border-slate-200">
                        <ListMusic className="h-4 w-4" />
                        {audio.chapters.length} konu
                    </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#177267] transition-colors line-clamp-2 leading-tight">
                    {cleanTitle}
                </h3>
            </div>
            
            <div className="p-6">
                {/* Section title */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-6 bg-[#177267] rounded-full"></div>
                    <h4 className="text-lg font-semibold text-slate-800">Konu Başlıkları</h4>
                </div>
                
                {/* Chapters Preview */}
                <div className="space-y-3 mb-6">
                    {audio.chapters.slice(0, 3).map((chapter, idx) => (
                        <div
                            key={idx}
                            className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-all duration-200 cursor-pointer border border-slate-200"
                            onClick={(e) => {
                                e.stopPropagation();
                                onPlay(audio, source, chapter.time);
                            }}
                        >
                            <span className="font-mono text-sm font-bold text-[#177267] bg-white px-2 py-1 rounded-md shrink-0 border border-slate-200">
                                {chapter.time}
                            </span>
                            <span className="text-base font-medium text-slate-800 line-clamp-2 leading-relaxed">
                                {chapter.title}
                            </span>
                        </div>
                    ))}
                    {audio.chapters.length > 3 && (
                        <div className="text-center py-2">
                            <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                                +{audio.chapters.length - 3} konu daha...
                            </span>
                        </div>
                    )}
                </div>
                
                {/* Play Button */}
                <button
                    onClick={() => onPlay(audio, source)}
                    className="w-full bg-[#177267] hover:bg-[#116358] text-white font-semibold py-4 px-6 rounded-lg flex items-center justify-center gap-3 transition-all duration-200"
                >
                    <Play className="h-5 w-5" />
                    <span className="text-lg">Kaydı Dinle</span>
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
    const [selectedSource, setSelectedSource] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    // *** YENİ: URL'den gelen zaman parametresini saklamak için state ***
    const [initialSeconds, setInitialSeconds] = useState(null);
    useEffect(() => {
        fetch(`${API_BASE_URL}/audio/all`)
            .then(res => {
                if (!res.ok) throw new Error("Ses kayıtları sunucudan alınamadı.");
                return res.json();
            })
            .then(data => setAudioData(data))
            .catch(err => setError(err.message))
            .finally(() => setIsLoading(false));
    }, []);
    const filteredAudios = useMemo(() => {
        const allAudios = [];
     
        Object.keys(audioData).forEach(source => {
            audioData[source].forEach(audio => {
                allAudios.push({ ...audio, source });
            });
        });
        return allAudios.filter(audio => {
            const matchesSearch = searchQuery === '' ||
                audio.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                audio.chapters.some(chapter =>
                    chapter.title.toLowerCase().includes(searchQuery.toLowerCase())
                );
         
            const matchesSource = selectedSource === 'all' || audio.source === selectedSource;
         
            return matchesSearch && matchesSource;
        });
    }, [audioData, searchQuery, selectedSource]);
    const handlePlayAudio = (audio, source, startTimeString = null) => {
        console.log('=== HANDLE PLAY AUDIO ===');
        console.log('Audio:', audio.title);
        console.log('StartTime:', startTimeString);
        let seconds = null;
        if (startTimeString) {
            const parts = startTimeString.split(':').map(Number);
            seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        setInitialSeconds(seconds);
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

                    {/* Simple filter (non-sticky) */}
                    <div className="w-full bg-white border border-slate-200 rounded-xl p-4">
                        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
                            {/* Search */}
                            <div className="relative flex-1 lg:max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#177267]" />
                                <input
                                    type="text"
                                    placeholder="Başlık veya konu ara..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg focus:border-[#177267] focus:ring-0 bg-white text-slate-700 placeholder-slate-400"
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
                    <div className={
                        viewMode === 'grid'
                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6"
                            : "space-y-4"
                    }>
                        {filteredAudios.map(audio => (
                            <AudioCard
                                key={`${audio.source}-${audio.id}`}
                                audio={audio}
                                source={audio.source}
                                onPlay={handlePlayAudio}
                            />
                        ))}
                    </div>
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