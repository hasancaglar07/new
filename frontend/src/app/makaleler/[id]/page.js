"use client";

import { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, User, Library, Loader2, ServerCrash, FileText, Share2, Bookmark, MessageCircle, Twitter, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Arama terimlerini vurgulama fonksiyonu
function highlightSearchTerm(text, searchTerm) {
    if (!text || !searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 text-yellow-800 px-1 rounded font-bold">$1</mark>');
}

// --- Yüklenme İskeleti Bileşeni ---
function ArticleSkeleton() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/30 via-teal-50/20 to-green-50/30">
            <div className="max-w-4xl mx-auto px-4 py-12">
                {/* Back Button Skeleton */}
                <div className="h-10 bg-emerald-200 rounded-lg w-32 mb-8 animate-pulse"></div>
                
                {/* Header Skeleton */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-emerald-200/50 p-8 mb-8 animate-pulse">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 bg-emerald-300 rounded animate-pulse"></div>
                        <div className="h-6 bg-emerald-200 rounded-full w-24 animate-pulse"></div>
                    </div>
                    <div className="h-12 bg-slate-300 rounded-lg w-full mb-6 animate-pulse"></div>
                    <div className="h-8 bg-slate-200 rounded-lg w-3/4 mb-6 animate-pulse"></div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-emerald-300 rounded animate-pulse"></div>
                            <div className="h-5 bg-emerald-200 rounded w-24 animate-pulse"></div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-emerald-300 rounded animate-pulse"></div>
                            <div className="h-5 bg-emerald-200 rounded w-20 animate-pulse"></div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-emerald-300 rounded animate-pulse"></div>
                            <div className="h-5 bg-emerald-200 rounded w-16 animate-pulse"></div>
                        </div>
                    </div>
                </div>
                
                {/* Content Skeleton */}
                <div className="bg-white rounded-2xl border border-gray-200/50 p-8 animate-pulse">
                    <div className="space-y-4">
                        <div className="h-5 bg-slate-200 rounded w-full"></div>
                        <div className="h-5 bg-slate-200 rounded w-full"></div>
                        <div className="h-5 bg-slate-200 rounded w-5/6"></div>
                        <div className="h-20 bg-slate-100 rounded-lg w-full mt-6"></div>
                        <div className="h-5 bg-slate-200 rounded w-full"></div>
                        <div className="h-5 bg-slate-200 rounded w-4/5"></div>
                        <div className="h-5 bg-slate-200 rounded w-full"></div>
                        <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                    </div>
                </div>
                
                {/* Loading Indicator */}
                <div className="text-center mt-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                    <p className="text-slate-600 font-medium">Makale yükleniyor...</p>
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
                className="text-center py-16 px-8 bg-gradient-to-br from-white via-red-50/30 to-red-50/20 rounded-3xl max-w-lg mx-auto border border-red-200/50 shadow-xl backdrop-blur-sm"
            >
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-200 to-red-300 rounded-full flex items-center justify-center shadow-lg">
                    <ServerCrash className="h-10 w-10 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">Makale Yüklenemedi</h3>
                <p className="text-slate-600 leading-relaxed mb-6">{message}</p>
                <div className="flex gap-3 justify-center">
                    <Button asChild className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white">
                        <Link href="/makaleler">
                            <ArrowLeft className="mr-2 h-4 w-4" /> 
                            Makale Listesi
                        </Link>
                    </Button>
                    <Button 
                        onClick={() => window.location.reload()} 
                        variant="outline"
                        className="border-emerald-200 hover:bg-emerald-50"
                    >
                        Tekrar Dene
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}


// --- ARTICLE CONTENT COMPONENT ---
function ArticleContent({ params }) {
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get('search') || '';
    const highlightMode = searchParams.get('highlight') === 'true';
    const targetPage = searchParams.get('page');
    const backUrl = searchQuery ? `/makaleler?search=${encodeURIComponent(searchQuery)}` : '/makaleler';
    const [article, setArticle] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selection, setSelection] = useState({ showMenu: false, text: '', x: 0, y: 0 });

    // Metin seçimi işlemini yönet
    useEffect(() => {
        const handleTextSelection = () => {
            const selectedText = window.getSelection().toString().trim();
            if (selectedText.length > 10) { // En az 10 karakter seçilmeli
                const range = window.getSelection().getRangeAt(0);
                const rect = range.getBoundingClientRect();
                setSelection({
                    showMenu: true,
                    text: selectedText,
                    x: rect.left + window.scrollX + rect.width / 2,
                    y: rect.top + window.scrollY - 10
                });
            }
        };

        const handleClickOutside = (event) => {
            // Paylaşım menüsü açıksa ve tıklama menünün dışındaysa kapat
            if (selection.showMenu && !event.target.closest('.share-menu')) {
                setSelection({ showMenu: false, text: '', x: 0, y: 0 });
            }
        };

        document.addEventListener('mouseup', handleTextSelection);
        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
            document.removeEventListener('mouseup', handleTextSelection);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [selection.showMenu]);

    // Modern ve güvenilir paylaşım fonksiyonları
    const shareOn = (platform) => {
        if (!selection.showMenu) return;

        const articleTitle = article?.title || article?.baslik || 'Makale';
        const authorName = article?.author || article?.yazar || 'Bilinmeyen Yazar';
        const pageUrl = window.location.href;
        const shareText = `"${selection.text}" - ${articleTitle} (${authorName})`;
        
        let url = '';

        switch (platform) {
            case 'whatsapp':
                url = `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + pageUrl)}`;
                break;
            case 'facebook':
                url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}&quote=${encodeURIComponent(shareText)}`;
                break;
            case 'twitter':
                url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`;
                break;
            default:
                return;
        }
        
        window.open(url, '_blank', 'noopener,noreferrer');
        setSelection({ showMenu: false, text: '', x: 0, y: 0 }); // Paylaştıktan sonra menüyü kapat
    };

    // Modern Pano API'si ile kopyalama
    const copyToClipboard = () => {
        if (!selection.showMenu) return;

        navigator.clipboard.writeText(selection.text).then(() => {
            alert('✅ Metin panoya kopyalandı!');
            setSelection({ showMenu: false, text: '', x: 0, y: 0 }); // Kopyaladıktan sonra menüyü kapat
        }).catch(err => {
            console.error('Kopyalama hatası:', err);
            alert('❌ Metin kopyalanamadı.');
        });
    };

    const { id } = use(params); // URL'den ID'yi al: /makaleler/123 -> id = "123"

    useEffect(() => {
        if (!id) return;

        const fetchArticle = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/article/${id}`);
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error("Bu adreste bir makale bulunamadı.");
                    }
                    throw new Error("Makale verisi sunucudan alınamadı.");
                }
                const data = await response.json();
                setArticle(data);
            } catch (error) {
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchArticle();
    }, [id]);

    if (isLoading) return <ArticleSkeleton />;
    if (error) return <ErrorState message={error} />;
    if (!article) return null;



    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/30 via-teal-50/20 to-green-50/30">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ duration: 0.8 }}
                className="max-w-4xl mx-auto px-4 py-12 md:py-20"
            >
                {/* Back Navigation */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="mb-8"
                >
                    <Button 
                        asChild 
                        variant="ghost" 
                        className="text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50 transition-colors"
                    >
                        <Link href={backUrl}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Tüm Makaleler
                        </Link>
                    </Button>
                </motion.div>

                <article>
                    {/* Article Header */}
                    <motion.header 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="bg-white/80 backdrop-blur-sm rounded-2xl border border-emerald-200/50 p-8 mb-8 shadow-lg"
                    >
                        {/* Category Badge */}
                        <div className="flex items-center gap-2 mb-6">
                            <FileText className="h-6 w-6 text-emerald-600" />
                            <span className="text-sm font-semibold text-emerald-700 bg-emerald-100/70 px-3 py-1.5 rounded-full">
                                {article.category}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl md:text-5xl font-bold text-slate-900 leading-tight mb-6">
                            {article.title}
                        </h1>



                        {/* Metadata */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-600">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center">
                                    <User className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Yazar</p>
                                    <p className="font-semibold text-slate-700">{article.author}</p>
                                </div>
                            </div>
                            

                            
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center">
                                    <Clock className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Okuma Süresi</p>
                                    <p className="font-semibold text-slate-700">~5 dakika</p>
                                </div>
                            </div>
                        </div>
                    </motion.header>
                    
                    {/* Article Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="bg-white rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden"
                    >
                        <div className="p-8 md:p-12">
                            <div
                                className="prose prose-lg max-w-none 
                                prose-headings:text-slate-800 prose-headings:font-bold prose-headings:tracking-tight prose-headings:scroll-mt-20
                                prose-h1:text-4xl prose-h1:mb-8 prose-h1:mt-12 prose-h1:leading-tight prose-h1:text-emerald-800
                                prose-h2:text-3xl prose-h2:mb-6 prose-h2:mt-10 prose-h2:leading-tight prose-h2:text-emerald-700 prose-h2:border-b prose-h2:border-emerald-200 prose-h2:pb-3
                                prose-h3:text-2xl prose-h3:mb-4 prose-h3:mt-8 prose-h3:leading-snug prose-h3:text-emerald-600
                                prose-h4:text-xl prose-h4:mb-3 prose-h4:mt-6 prose-h4:text-slate-700 prose-h4:font-semibold
                                prose-p:text-slate-700 prose-p:leading-relaxed prose-p:mb-6 prose-p:text-lg prose-p:font-normal
                                prose-a:text-emerald-600 prose-a:font-medium prose-a:no-underline hover:prose-a:text-emerald-700 hover:prose-a:underline prose-a:transition-colors
                                prose-strong:text-slate-800 prose-strong:font-semibold prose-strong:bg-yellow-100 prose-strong:px-1 prose-strong:rounded
                                prose-em:text-slate-600 prose-em:italic prose-em:font-medium
                                prose-blockquote:border-l-4 prose-blockquote:border-emerald-300 prose-blockquote:bg-emerald-50/70 prose-blockquote:pl-8 prose-blockquote:pr-6 prose-blockquote:py-6 prose-blockquote:my-8 prose-blockquote:rounded-r-xl prose-blockquote:shadow-sm prose-blockquote:italic prose-blockquote:text-emerald-800
                                prose-ul:my-8 prose-ul:space-y-3 prose-ol:my-8 prose-ol:space-y-3 prose-li:text-slate-700 prose-li:leading-relaxed prose-li:text-lg
                                prose-code:text-emerald-700 prose-code:bg-emerald-50 prose-code:px-3 prose-code:py-1 prose-code:rounded-md prose-code:font-mono prose-code:text-base prose-code:border prose-code:border-emerald-200
                                prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 prose-pre:rounded-xl prose-pre:p-6 prose-pre:my-8 prose-pre:shadow-sm
                                prose-hr:border-emerald-200 prose-hr:my-16 prose-hr:border-2
                                prose-table:my-10 prose-table:shadow-lg prose-table:rounded-lg prose-table:overflow-hidden
                                prose-thead:bg-emerald-100 prose-th:text-emerald-800 prose-th:font-bold prose-th:p-4 prose-th:text-left
                                prose-td:p-4 prose-td:border-slate-200 prose-td:text-slate-700
                                prose-img:rounded-xl prose-img:shadow-lg prose-img:my-8
                                first-letter:text-7xl first-letter:font-bold first-letter:text-emerald-600 first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:leading-none
                                "
                                style={{
                                    textAlign: 'justify',
                                    hyphens: 'auto',
                                    wordSpacing: '0.1em',
                                    letterSpacing: '0.01em'
                                }}
                                dangerouslySetInnerHTML={{ 
                                    __html: highlightMode ? 
                                        // Highlight modunda ek vurgulama
                                        `<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
                                            <p class="text-yellow-800 font-semibold text-sm mb-2">📍 Kaynak Alıntısı${targetPage ? ` - Sayfa ${targetPage}` : ''}</p>
                                            <p class="text-yellow-700 text-sm">Bu içerik sohbet asistanı tarafından referans gösterilmiştir.</p>
                                        </div>` + 
                                        highlightSearchTerm(article.content, searchQuery) :
                                        highlightSearchTerm(article.content, searchQuery)
                                }}
                            />
                        </div>
                        
                        {/* Article Footer */}
                        <div className="bg-gradient-to-r from-emerald-50/60 to-teal-50/40 border-t border-emerald-100/50 p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Button 
                                        asChild 
                                        className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
                                    >
                                        <Link href={backUrl}>
                                            <Library className="mr-2 h-4 w-4" />
                                            Diğer Makaleler
                                        </Link>
                                    </Button>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="border-emerald-200 hover:bg-emerald-50 text-emerald-700"
                                    >
                                        <Share2 className="h-4 w-4 mr-2" />
                                        Paylaş
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="border-emerald-200 hover:bg-emerald-50 text-emerald-700"
                                    >
                                        <Bookmark className="h-4 w-4 mr-2" />
                                        Kaydet
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </article>

                {/* Modern Paylaşım Menüsü */}
                {selection.showMenu && selection.text && (
                    <div 
                        className="share-menu"
                        style={{
                            position: 'fixed',
                            left: '50%',
                            bottom: '20px',
                            transform: 'translateX(-50%)',
                            zIndex: 9999,
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                            border: '1px solid #e5e7eb',
                            padding: '8px',
                            display: 'flex',
                            gap: '4px',
                            minWidth: 'max-content',
                            maxWidth: 'calc(100vw - 40px)'
                        }}
                    >
                        <button
                            onClick={() => shareOn('whatsapp')}
                            className="flex items-center gap-1 px-2 py-2 md:px-3 rounded-lg hover:bg-green-50 transition-colors text-green-700 font-medium text-xs md:text-sm"
                            title="WhatsApp'ta Paylaş"
                        >
                            <span className="text-base">💬</span>
                            <span className="hidden sm:inline">WhatsApp</span>
                        </button>
                        
                        <button
                            onClick={() => shareOn('facebook')}
                            className="flex items-center gap-1 px-2 py-2 md:px-3 rounded-lg hover:bg-blue-50 transition-colors text-blue-700 font-medium text-xs md:text-sm"
                            title="Facebook'ta Paylaş"
                        >
                            <span className="text-base">📘</span>
                            <span className="hidden sm:inline">Facebook</span>
                        </button>
                        
                        <button
                            onClick={() => shareOn('twitter')}
                            className="flex items-center gap-1 px-2 py-2 md:px-3 rounded-lg hover:bg-sky-50 transition-colors text-sky-700 font-medium text-xs md:text-sm"
                            title="Twitter'da Paylaş"
                        >
                            <span className="text-base">🐦</span>
                            <span className="hidden sm:inline">Twitter</span>
                        </button>
                        
                        <button
                            onClick={copyToClipboard}
                            className="flex items-center gap-1 px-2 py-2 md:px-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium text-xs md:text-sm"
                            title="Panoya Kopyala"
                        >
                            <span className="text-base">📋</span>
                            <span className="hidden sm:inline">Kopyala</span>
                        </button>
                        
                        <button
                            onClick={() => setSelection({ showMenu: false, text: '', x: 0, y: 0 })}
                            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-red-50 transition-colors text-red-500 font-bold"
                            title="Kapat"
                        >
                            ✕
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

// --- ANA MAKALE OKUMA SAYFASI ---
export default function ArticleReadPage({ params }) {
    return (
        <Suspense fallback={<ArticleSkeleton />}>
            <ArticleContent params={params} />
        </Suspense>
    );
}

// Tailwind'in `prose` eklentisini kullanabilmek için
// `tailwind.config.js` dosyasına bir eklenti eklememiz gerekebilir.
// Eğer metinler stillenmemiş görünürse, bu adımı uygulayacağız.