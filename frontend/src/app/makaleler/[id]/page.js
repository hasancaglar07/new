// frontend/src/app/makaleler/[id]/page.js

"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, User, Library, Loader2, ServerCrash, FileText, Calendar, Share2, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

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
                            <div className="w-5 h-5 bg-slate-300 rounded animate-pulse"></div>
                            <div className="h-5 bg-slate-200 rounded w-24 animate-pulse"></div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-slate-300 rounded animate-pulse"></div>
                            <div className="h-5 bg-slate-200 rounded w-20 animate-pulse"></div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-slate-300 rounded animate-pulse"></div>
                            <div className="h-5 bg-slate-200 rounded w-16 animate-pulse"></div>
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


// --- ANA MAKALE OKUMA SAYFASI ---
// 'params' prop'u sayesinde URL'deki [id] değerini alabiliyoruz.
export default function ArticleReadPage({ params }) {
    const [article, setArticle] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { id } = params; // URL'den ID'yi al: /makaleler/123 -> id = "123"

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

    // Makalenin tarihini formatlayalım
    const articleDate = new Date(article.scraped_at).toLocaleDateString('tr-TR', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

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
                        <Link href="/makaleler">
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

                        {/* Subtitle/Description */}
                        <p className="text-xl text-slate-600 leading-relaxed mb-8 font-light">
                            Bu makalede {article.category.toLowerCase()} konusunda değerli bilgiler bulacaksınız.
                        </p>

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
                                    <Calendar className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tarih</p>
                                    <time dateTime={article.scraped_at} className="font-semibold text-slate-700">
                                        {articleDate}
                                    </time>
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
                                prose-headings:text-slate-800 prose-headings:font-bold prose-headings:tracking-tight
                                prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                                prose-p:text-slate-700 prose-p:leading-relaxed prose-p:mb-6
                                prose-a:text-emerald-600 prose-a:font-medium prose-a:no-underline hover:prose-a:text-emerald-700 hover:prose-a:underline
                                prose-strong:text-slate-800 prose-strong:font-semibold
                                prose-em:text-slate-600 prose-em:italic
                                prose-blockquote:border-l-4 prose-blockquote:border-emerald-200 prose-blockquote:bg-emerald-50/50 prose-blockquote:pl-6 prose-blockquote:py-4 prose-blockquote:my-8 prose-blockquote:rounded-r-lg
                                prose-ul:my-6 prose-ol:my-6 prose-li:my-2 prose-li:text-slate-700
                                prose-code:text-emerald-700 prose-code:bg-emerald-50 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:font-mono prose-code:text-sm
                                prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 prose-pre:rounded-lg
                                prose-hr:border-emerald-200 prose-hr:my-12
                                prose-table:my-8 prose-thead:bg-emerald-50 prose-th:text-emerald-700 prose-th:font-semibold prose-th:p-3 prose-td:p-3 prose-td:border-slate-200
                                "
                                dangerouslySetInnerHTML={{ __html: article.content }}
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
                                        <Link href="/makaleler">
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
            </motion.div>
        </div>
    );
}

// Tailwind'in `prose` eklentisini kullanabilmek için
// `tailwind.config.js` dosyasına bir eklenti eklememiz gerekebilir.
// Eğer metinler stillenmemiş görünürse, bu adımı uygulayacağız.