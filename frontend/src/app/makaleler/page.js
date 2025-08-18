// frontend/src/app/makaleler/page.js

"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Library, Loader2, ServerCrash, BookText, Search, Filter, User, Eye, FileText, ArrowRight, ChevronLeft, ChevronRight, Share2, MessageCircle, Twitter, Facebook } from 'lucide-react';

// ShadCN UI ve Yerel Bileşenler
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// --- Yüklenme İskeleti Bileşeni ---
function ArticlesSkeleton() {
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

                {/* Search Filter Skeleton */}
                <div className="max-w-4xl mx-auto mb-16">
                    <div className="bg-white/90 rounded-2xl border border-emerald-200/50 overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-50/60 to-teal-50/40 p-6 border-b border-emerald-100/50">
                            <div className="h-6 bg-emerald-200 rounded-md w-48 mb-2 animate-pulse"></div>
                            <div className="h-4 bg-slate-200 rounded-md w-72 animate-pulse"></div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="h-12 bg-emerald-100 rounded-lg animate-pulse"></div>
                                <div className="h-12 bg-emerald-100 rounded-lg animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Articles Skeleton */}
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 border-b border-gray-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-5 h-5 bg-emerald-300 rounded animate-pulse"></div>
                                        <div className="h-6 bg-emerald-200 rounded-full w-20 animate-pulse"></div>
                                    </div>
                                    <div className="h-6 bg-slate-300 rounded w-full mb-2 animate-pulse"></div>
                                    <div className="h-6 bg-slate-200 rounded w-3/4 animate-pulse"></div>
                                </div>
                                <div className="p-6 space-y-3">
                                    <div className="h-4 bg-slate-200 rounded w-full animate-pulse"></div>
                                    <div className="h-4 bg-slate-200 rounded w-5/6 animate-pulse"></div>
                                    <div className="h-4 bg-slate-200 rounded w-4/6 animate-pulse"></div>
                                    <div className="h-10 bg-emerald-200 rounded-lg mt-4 animate-pulse"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Loading Indicator */}
                <div className="text-center mt-12">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                    <p className="text-slate-600 font-medium">Makaleler yükleniyor...</p>
                </div>
            </div>
        </div>
    );
}

// --- Hata Durumu Bileşeni ---
function ErrorState({ message }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/30 via-teal-50/20 to-green-50/30 flex items-center justify-center">
            <motion.div 
                initial={{ opacity: 0, y: 30, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                transition={{ duration: 0.6 }}
                className="text-center py-16 px-8 bg-gradient-to-br from-white via-red-50/30 to-red-50/20 rounded-3xl max-w-lg mx-auto border border-red-200/50 shadow-xl backdrop-blur-sm relative overflow-hidden"
            >
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-200 to-red-300 rounded-full flex items-center justify-center shadow-lg">
                    <ServerCrash className="h-10 w-10 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">Bir Hata Oluştu</h3>
                <p className="text-slate-600 leading-relaxed mb-6">{message}</p>
                <Button 
                    onClick={() => window.location.reload()} 
                    className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
                >
                    Tekrar Dene
                </Button>
            </motion.div>
        </div>
    );
}

// --- Makale Kartı Bileşeni ---
function ArticleCard({ article, index, query }) {
    const cardVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: { 
            opacity: 1, 
            y: 0, 
            scale: 1,
            transition: { 
                delay: index * 0.1,
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94]
            }
        }
    };

    // Arama kelimesi vurgulaması
    const highlightText = (text, searchTerm) => {
        if (!text || !searchTerm) return text;
        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark class="bg-yellow-200 text-yellow-800 px-1 rounded font-bold">$1</mark>');
    };

    // Kelime sıklığı hesaplama
    const calculateWordFrequency = (content, searchTerm) => {
        if (!content || !searchTerm) return 0;
        const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = content.match(regex);
        return matches ? matches.length : 0;
    };

    // Makale özeti oluştur (farklı API endpoint'lerinden gelen farklı field adları)
    const content = article.content || article.icerik || '';
    const alinti = article.alinti || article.excerpt || '';
    
    // Önce alinti varsa onu kullan, yoksa content'den oluştur
    const excerpt = alinti ? 
        alinti : 
        (content ? 
            content.replace(/<[^>]*>/g, '').substring(0, 150) + '...' : 
            'Bu makalenin özeti mevcut değil.');



    // Kelime sıklığı
    const wordFrequency = calculateWordFrequency(content + ' ' + (article.title || article.baslik || ''), query);

    // Sosyal paylaşım fonksiyonları
    const articleId = article.id || article.makale_id || article._id;
    const authorName = article.author || article.yazar || 'Bilinmeyen Yazar';
    const articleTitle = article.title || article.baslik || 'Makale';
    
    const shareOnWhatsApp = (text) => {
        const articleUrl = `${window.location.protocol}//${window.location.host}/makaleler/${articleId}`;
        const shareText = `📚 *${articleTitle}*\n\n✍️ Yazar: ${authorName}\n\n🔗 Okumak için: ${articleUrl}\n\n#makale #okuma`;
        const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        window.open(url, '_blank');
    };

    const shareOnFacebook = (text) => {
        const articleUrl = `${window.location.protocol}//${window.location.host}/makaleler/${articleId}`;
        const shareText = `📚 ${articleTitle}\n\n✍️ Yazar: ${authorName}\n\nBu değerli makaleyi okumak için tıklayın!`;
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}&quote=${encodeURIComponent(shareText)}`;
        window.open(url, '_blank');
    };

    const shareOnTwitter = (text) => {
        const articleUrl = `${window.location.protocol}//${window.location.host}/makaleler/${articleId}`;
        const shareText = `📚 "${articleTitle}" - ${authorName}\n\n🔗 ${articleUrl}\n\n#makale #okuma #bilgi`;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
        window.open(url, '_blank');
    };

    return (
        <motion.div 
            variants={cardVariants}
            whileHover={{ 
                y: -4,
                transition: { duration: 0.2, ease: "easeOut" }
            }}
        >
            <Card className="h-full overflow-hidden bg-white hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-emerald-200/60 group">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-50/60 to-teal-50/40 p-6 border-b border-emerald-100/50">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-emerald-600/80" />
                            <span className="text-sm font-medium text-emerald-700/90 bg-emerald-100/70 px-2 py-1 rounded-full">
                                {article.category || article.kategori || 'Genel'}
                            </span>
                        </div>
                        {query && wordFrequency > 0 && (
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                                {wordFrequency} eşleşme
                            </span>
                        )}
                    </div>
                    <CardTitle 
                        className="text-lg font-bold text-slate-800 group-hover:text-emerald-700/90 transition-colors line-clamp-2 leading-tight"
                        dangerouslySetInnerHTML={{ __html: highlightText(article.title || article.baslik || 'Başlık belirtilmemiş', query) }}
                    />
                </div>
                
                {/* Content */}
                <CardContent className="p-6 flex-grow">
                    <div 
                        className="text-slate-600 leading-relaxed mb-4 line-clamp-4 text-justify" 
                        style={{
                            fontSize: '1rem',
                            lineHeight: '1.7',
                            letterSpacing: '0.01em',
                            wordSpacing: '0.05em'
                        }}
                        dangerouslySetInnerHTML={{ __html: highlightText(excerpt, query) }}
                    />
                    
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                            <User className="h-3 w-3" />
                            <span>{article.author || article.yazar || 'Yazar belirtilmemiş'}</span>
                        </div>
                        
                        {/* Sosyal Paylaşım Butonları */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    shareOnWhatsApp(article.title || article.baslik || 'Makale');
                                }}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors flex items-center justify-center"
                                title="WhatsApp'ta Paylaş"
                            >
                                <span className="text-sm">💬</span>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    shareOnFacebook(article.title || article.baslik || 'Makale');
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex items-center justify-center"
                                title="Facebook'ta Paylaş"
                            >
                                <span className="text-sm">📘</span>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    shareOnTwitter(article.title || article.baslik || 'Makale');
                                }}
                                className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-full transition-colors flex items-center justify-center"
                                title="X'te Paylaş"
                            >
                                <span className="text-sm">🐦</span>
                            </button>
                        </div>
                    </div>
                </CardContent>
                
                {/* Footer */}
                <CardFooter className="p-6 pt-0">
                    <Button 
                        asChild 
                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-medium transition-all duration-200 transform hover:scale-105"
                    >
                        <Link href={`/makaleler/${article.id || article.makale_id || article._id}${query ? `?search=${encodeURIComponent(query)}` : ''}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Makaleyi Oku
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </motion.div>
    );
}

// --- ANA MAKALELER SAYFASI ---
export default function ArticlesPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const [authors, setAuthors] = useState([]);
    const [articles, setArticles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || "");
    const [selectedAuthor, setSelectedAuthor] = useState(searchParams.get('author') || "all");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalArticles, setTotalArticles] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    
    const ARTICLES_PER_PAGE = 12; // Sayfa başına makale sayısı
    
    // URL parametrelerini güncelle
    const updateURL = (newSearchTerm, newAuthor) => {
        const params = new URLSearchParams();
        if (newSearchTerm) params.set('q', newSearchTerm);
        if (newAuthor && newAuthor !== 'all') params.set('author', newAuthor);
        
        const newURL = params.toString() ? `/makaleler?${params.toString()}` : '/makaleler';
        router.replace(newURL, { scroll: false });
    };
    
    // Arama terimi değiştirme fonksiyonu
    const handleSearchChange = (newSearchTerm) => {
        setSearchTerm(newSearchTerm);
        updateURL(newSearchTerm, selectedAuthor);
    };
    
    // Yazar değiştirme fonksiyonu
    const handleAuthorChange = (newAuthor) => {
        setSelectedAuthor(newAuthor);
        updateURL(searchTerm, newAuthor);
    };

    useEffect(() => {
        const fetchAuthors = async () => {
            try {
                // Mevcut makaleleri çekip yazarları al
                let allArticles = [];
                
                // Önce mevcut articles state'inden yazarları çek
                if (articles && articles.length > 0) {
                    allArticles = articles;
                } else {
                    // Eğer articles boşsa, basit bir API çağrısı yap
                    try {
                        const response = await fetch(`${API_BASE_URL}/articles/paginated?page=1&limit=50`);
                        if (response.ok) {
                            const data = await response.json();
                            allArticles = data.articles || [];
                        }
                    } catch (apiError) {
                        console.log('API çağrısı başarısız, varsayılan yazarlar kullanılıyor');
                    }
                }
                
                // Yazarları çıkar
                const authorSet = new Set();
                allArticles.forEach(article => {
                    const author = article.author || article.yazar;
                    if (author && author.trim()) {
                        authorSet.add(author.trim());
                    }
                });
                
                // Eğer hiç yazar bulunamazsa varsayılan liste kullan
                if (authorSet.size === 0) {
                    authorSet.add('Alemdar Yayınları');
                    authorSet.add('Ali Ramazan Dinç');
                    authorSet.add('M. Sami Ramazanoğlu');
                    authorSet.add('Hacı Hasan Efendi');
                }
                
                // Kalemdar öncelikli sıralama
                const authorList = Array.from(authorSet).sort((a, b) => {
                    // "Kalemdar" öncelikli sıralama
                    const isKalemdarA = a.toLowerCase().includes('kalemdar');
                    const isKalemdarB = b.toLowerCase().includes('kalemdar');
                    
                    if (isKalemdarA && !isKalemdarB) return -1;
                    if (!isKalemdarA && isKalemdarB) return 1;
                    
                    // "Alemdar" ikinci öncelik
                    if (a.includes('Alemdar') && !b.includes('Alemdar')) return -1;
                    if (!a.includes('Alemdar') && b.includes('Alemdar')) return 1;
                    
                    return a.localeCompare(b, 'tr');
                });
                
                console.log('Gerçek makale yazarları:', authorList);
                setAuthors(authorList);
            } catch (error) {
                console.error("Yazar fetch hatası:", error);
                // Hata durumunda bile temel yazarları göster
                setAuthors(['Alemdar Yayınları', 'Ali Ramazan Dinç', 'M. Sami Ramazanoğlu']);
            }
        };
        fetchAuthors();
    }, [articles]);

    useEffect(() => {
        const fetchArticles = async () => {
            if (currentPage === 1) {
                setIsLoading(true);
                setArticles([]);
            } else {
                setLoadingMore(true);
            }
            try {
                // API parametrelerini hazırla
                const params = new URLSearchParams({
                    page: currentPage,
                    limit: ARTICLES_PER_PAGE,
                    search: searchTerm,
                    author: selectedAuthor !== "all" ? selectedAuthor : ""
                });

                // Eğer arama yapılıyorsa, anasayfadaki gibi /search/all endpoint'ini kullan
                let response, data;
                if (searchTerm.trim()) {
                    const searchUrl = new URL(`${API_BASE_URL}/search/all`);
                    searchUrl.searchParams.append('q', searchTerm);
                    response = await fetch(searchUrl);
                    if (!response.ok) {
                        throw new Error("Arama yapılamadı.");
                    }
                    data = await response.json();
                    const allArticles = data.sonuclar?.filter(r => r.type === 'article') || [];
                    
                    // Yazar filtresi uygula
                    const filteredArticles = selectedAuthor !== "all" 
                        ? allArticles.filter(article => {
                            const author = article.author || article.yazar || '';
                            console.log('Makale yazarı:', author, 'Seçilen yazar:', selectedAuthor);
                            return author.toLowerCase().includes(selectedAuthor.toLowerCase()) || 
                                   selectedAuthor.toLowerCase().includes(author.toLowerCase());
                        })
                        : allArticles;
                    
                    // Pagination uygula
                    const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
                    const endIndex = startIndex + ARTICLES_PER_PAGE;
                    const paginatedArticles = filteredArticles.slice(startIndex, endIndex);
                    
                    if (currentPage === 1) {
                        setArticles(paginatedArticles);
                    } else {
                        setArticles(prev => [...prev, ...paginatedArticles]);
                    }
                    setTotalPages(Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE));
                    setTotalArticles(filteredArticles.length);
                    setHasMore(paginatedArticles.length === ARTICLES_PER_PAGE);
                } else {
                    // Yazar filtresi varsa search/all endpoint'ini kullan
                    if (selectedAuthor !== "all") {
                        const searchUrl = new URL(`${API_BASE_URL}/search/all`);
                        searchUrl.searchParams.append('q', selectedAuthor);
                        response = await fetch(searchUrl);
                        if (!response.ok) {
                            throw new Error("Arama yapılamadı.");
                        }
                        data = await response.json();
                        let allArticles = data.sonuclar?.filter(r => r.type === 'article') || [];
                        
                        // Yazar filtresi uygula
                        allArticles = allArticles.filter(article => {
                            const author = article.author || article.yazar || '';
                            console.log('Makale yazarı:', author, 'Seçilen yazar:', selectedAuthor);
                            return author.toLowerCase().includes(selectedAuthor.toLowerCase()) || 
                                   selectedAuthor.toLowerCase().includes(author.toLowerCase());
                        });
                        
                        // Pagination uygula
                        const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
                        const endIndex = startIndex + ARTICLES_PER_PAGE;
                        const newArticles = allArticles.slice(startIndex, endIndex);
                        
                        if (currentPage === 1) {
                            setArticles(newArticles);
                        } else {
                            setArticles(prev => [...prev, ...newArticles]);
                        }
                        setTotalPages(Math.ceil(allArticles.length / ARTICLES_PER_PAGE));
                        setTotalArticles(allArticles.length);
                        setHasMore(newArticles.length === ARTICLES_PER_PAGE);
                    } else {
                        // Yazar filtresi yoksa normal paginated endpoint
                        response = await fetch(`${API_BASE_URL}/articles/paginated?page=${currentPage}&limit=${ARTICLES_PER_PAGE}`);
                        if (!response.ok) {
                            throw new Error("Makaleler alınamadı.");
                        }
                        
                        data = await response.json();
                        const newArticles = data.articles || [];
                        
                        if (currentPage === 1) {
                            setArticles(newArticles);
                        } else {
                            setArticles(prev => [...prev, ...newArticles]);
                        }
                        setTotalPages(data.total_pages || 0);
                        setTotalArticles(data.total_articles || 0);
                        setHasMore(newArticles.length === ARTICLES_PER_PAGE);
                    }
                }
                
            } catch (error) {
                setError(error.message);
                if (currentPage === 1) {
                    setArticles([]);
                    setTotalPages(0);
                    setTotalArticles(0);
                }
                setHasMore(false);
            } finally {
                setIsLoading(false);
                setLoadingMore(false);
            }
        };

        // Debounce search - arama 500ms sonra tetiklensin
        const timeoutId = setTimeout(() => {
            fetchArticles();
        }, searchTerm ? 500 : 0);

        return () => clearTimeout(timeoutId);
    }, [currentPage, searchTerm, selectedAuthor]);

    // Sayfa değiştiğinde üst kısma scroll
    useEffect(() => {
        if (currentPage > 1) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentPage]);

    // Search veya author değiştiğinde sayfa 1'e dön
    useEffect(() => {
        setCurrentPage(1);
        setHasMore(true);
        setArticles([]);
    }, [searchTerm, selectedAuthor]);

    // Akıllı sıralama: Arama varsa kelime sıklığına göre, yoksa yazar bazlı makale sayısına göre
    const sortedArticles = useMemo(() => {
        if (!articles.length) return articles;
        
        if (searchTerm) {
            // Arama yapılıyorsa kelime sıklığına göre sırala
            return [...articles].sort((a, b) => {
                const calculateWordFrequency = (content, searchTerm) => {
                    if (!content || !searchTerm) return 0;
                    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    const matches = content.match(regex);
                    return matches ? matches.length : 0;
                };
                
                const freqA = calculateWordFrequency((a.content || a.icerik || '') + ' ' + (a.title || a.baslik || ''), searchTerm);
                const freqB = calculateWordFrequency((b.content || b.icerik || '') + ' ' + (b.title || b.baslik || ''), searchTerm);
                
                return freqB - freqA; // Büyükten küçüğe sıralama
            });
        } else {
            // Arama yapılmıyorsa yazar bazlı makale sayısına göre sırala
            const authorCounts = {};
            articles.forEach(article => {
                const author = article.author || article.yazar || 'Bilinmeyen';
                authorCounts[author] = (authorCounts[author] || 0) + 1;
            });
            
            return [...articles].sort((a, b) => {
                const authorA = a.author || a.yazar || 'Bilinmeyen';
                const authorB = b.author || b.yazar || 'Bilinmeyen';
                
                // "Kalemdar" mutlak öncelik - en güçlü sıralama
                const isKalemdarA = authorA.toLowerCase().includes('kalemdar') || authorA.toLowerCase().includes('ks');
                const isKalemdarB = authorB.toLowerCase().includes('kalemdar') || authorB.toLowerCase().includes('ks');
                
                if (isKalemdarA && !isKalemdarB) return -1;
                if (!isKalemdarA && isKalemdarB) return 1;
                
                // Kalemdar makaleleri kendi içinde de öncelikli sıralansın
                if (isKalemdarA && isKalemdarB) {
                    // Kalemdar makaleleri arasında makale sayısına göre sırala
                    const countA = authorCounts[authorA] || 0;
                    const countB = authorCounts[authorB] || 0;
                    if (countB !== countA) {
                        return countB - countA;
                    }
                    return authorA.localeCompare(authorB, 'tr');
                }
                
                // "Alemdar" ikinci öncelik
                const isAlemdarA = authorA.includes('Alemdar');
                const isAlemdarB = authorB.includes('Alemdar');
                
                if (isAlemdarA && !isAlemdarB) return -1;
                if (!isAlemdarA && isAlemdarB) return 1;
                
                // Bilinmeyen/Misafir yazarları en sona at
                const isUnknownA = authorA === 'Bilinmeyen' || authorA.toLowerCase().includes('misafir');
                const isUnknownB = authorB === 'Bilinmeyen' || authorB.toLowerCase().includes('misafir');
                
                if (!isUnknownA && isUnknownB) return -1;
                if (isUnknownA && !isUnknownB) return 1;
                
                const countA = authorCounts[authorA] || 0;
                const countB = authorCounts[authorB] || 0;
                
                // Sonra yazar makale sayısına göre, sonra alfabetik sırala
                if (countB !== countA) {
                    return countB - countA; // En çok makale yazan üstte
                }
                return authorA.localeCompare(authorB, 'tr'); // Alfabetik sıralama
            });
        }
    }, [articles, searchTerm]);

    if (isLoading) return <ArticlesSkeleton />;
    if (error) return <ErrorState message={error} />;

    // Pagination bileşeni
    const PaginationComponent = () => {
        if (totalPages <= 1) return null;

        const getPageNumbers = () => {
            const delta = 2;
            const range = [];
            const rangeWithDots = [];

            for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
                range.push(i);
            }

            if (currentPage - delta > 2) {
                rangeWithDots.push(1, '...');
            } else {
                rangeWithDots.push(1);
            }

            rangeWithDots.push(...range);

            if (currentPage + delta < totalPages - 1) {
                rangeWithDots.push('...', totalPages);
            } else {
                rangeWithDots.push(totalPages);
            }

            return rangeWithDots;
        };

        return (
            <div className="flex items-center justify-center gap-2 mt-12">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="border-emerald-200 hover:bg-emerald-50"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Önceki
                </Button>

                <div className="flex items-center gap-1">
                    {getPageNumbers().map((pageNum, index) => (
                        pageNum === '...' ? (
                            <span key={index} className="px-3 py-2 text-slate-400">...</span>
                        ) : (
                            <Button
                                key={index}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className={currentPage === pageNum 
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                                    : "border-emerald-200 hover:bg-emerald-50"
                                }
                            >
                                {pageNum}
                            </Button>
                        )
                    ))}
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="border-emerald-200 hover:bg-emerald-50"
                >
                    Sonraki
                    <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>
        );
    };

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
                    <h1 className="text-4xl md:text-5xl font-bold text-[#177267]">Makaleler Kütüphanesi</h1>
                    <p className="mt-3 text-base md:text-lg text-slate-600">Sitede yayınlanan tüm yazılara göz atın, arayın ve okuyun</p>
                </motion.header>

                {/* Simple filter (non-sticky) */}
                <div className="max-w-4xl mx-auto mb-10">
                    <div className="w-full bg-white border border-slate-200 rounded-xl p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Author */}
                            <div>
                                <Select value={selectedAuthor} onValueChange={handleAuthorChange}>
                                    <SelectTrigger className="w-full h-11 text-base border-slate-300 focus:border-[#177267] focus:ring-0">
                                        <SelectValue placeholder="Yazar seçin..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tüm Yazarlar</SelectItem>
                                        {authors.map(author => (
                                            <SelectItem key={author} value={author}>{author}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Search */}
                            <div className="relative w-full">
                                <Input 
                                    placeholder="Başlık veya yazar ile ara..." 
                                    value={searchTerm} 
                                    onChange={(e) => handleSearchChange(e.target.value)} 
                                    className="w-full h-11 pl-4 border-slate-300 focus:border-[#177267] focus:ring-0"
                                />
                            </div>
                        </div>
                        {/* Suggestions */}
                        <div className="flex flex-wrap gap-2 mt-3">
                            {["Tasavvuf", "Ahlak", "Fıkıh", "Maneviyat", "İlim"].map((label) => (
                                <button key={label} onClick={() => handleSearchChange(label)} className="px-3 py-1.5 text-sm rounded-full border border-slate-300 text-[#177267] hover:bg-slate-50">
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Results */}
                <main className="max-w-6xl mx-auto">
                    {sortedArticles.length > 0 ? (
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={{
                                visible: {
                                    transition: {
                                        staggerChildren: 0.1
                                    }
                                }
                            }}
                        >
                            <div className="mb-8">
                                <div className="flex items-center justify-center gap-4 text-slate-600">
                                    <p>
                                        <span className="text-emerald-600 font-semibold">{sortedArticles.length}</span> makale gösteriliyor
                                        {searchTerm ? (
                                            <span className="text-slate-500 text-sm ml-2">
                                                (kelime sıklığına göre sıralı)
                                            </span>
                                        ) : (
                                            <span className="text-slate-500 text-sm ml-2">
                                                (Kalemdar (ks) öncelikli sıralı)
                                            </span>
                                        )}
                                    </p>
                                    <span className="w-px h-4 bg-slate-300"></span>
                                    <p>
                                        <span className="text-emerald-600 font-semibold">{totalArticles}</span> toplam makale
                                    </p>
                                    <span className="w-px h-4 bg-slate-300"></span>
                                    <p>
                                        <span className="text-emerald-600 font-semibold">{sortedArticles.length}</span> / <span className="text-emerald-600 font-semibold">{totalArticles}</span> makale yüklendi
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {sortedArticles.map((article, index) => (
                                    <ArticleCard 
                                        key={article.id} 
                                        article={article} 
                                        index={index}
                                        query={searchTerm}
                                    />
                                ))}
                            </div>
                            
                            {/* Load More Button */}
                            {hasMore && sortedArticles.length < totalArticles && (
                                <div className="flex justify-center mt-12">
                                    <Button
                                        onClick={() => {
                                            setCurrentPage(prev => prev + 1);
                                        }}
                                        disabled={loadingMore}
                                        className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-8 py-3 text-lg font-medium"
                                    >
                                        {loadingMore ? (
                                            <>
                                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                                Yükleniyor...
                                            </>
                                        ) : (
                                            'Daha Fazla Makale Yükle'
                                        )}
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            className="text-center py-24 px-8 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 rounded-3xl max-w-2xl mx-auto border border-emerald-200/50 shadow-xl backdrop-blur-sm"
                        >
                            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-emerald-200 to-teal-300 rounded-full flex items-center justify-center shadow-lg">
                                <FileText className="h-12 w-12 text-emerald-600" />
                            </div>
                            <h3 className="text-3xl font-bold text-slate-800 mb-4 bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
                                Makale Bulunamadı
                            </h3>
                            <p className="text-lg text-slate-600 leading-relaxed max-w-lg mx-auto mb-6">
                                Arama kriterlerinize veya seçtiğiniz kategoriye uyan bir makale bulunamadı. 
                                Lütfen farklı bir arama yapmayı deneyin.
                            </p>
                            <div className="flex items-center justify-center gap-4 text-sm text-emerald-600">
                                <div className="flex items-center gap-2">
                                    <Search className="h-4 w-4" />
                                    <span>Farklı kelimeler deneyin</span>
                                </div>
                                <div className="w-px h-4 bg-emerald-300"></div>
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4" />
                                    <span>Filtreleri değiştirin</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </main>
            </div>
        </div>
    );
}