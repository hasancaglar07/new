// frontend/src/app/makaleler/page.js

"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Library, Loader2, ServerCrash, BookText, Search, Filter, Calendar, User, Eye, FileText, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

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

    // Makale özeti oluştur (content'den ilk 150 karakter)
    const excerpt = article.content ? 
        article.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...' : 
        'Bu makalenin özeti mevcut değil.';

    const articleDate = new Date(article.scraped_at).toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'short', year: 'numeric'
    });

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
                    <div className="flex items-center gap-2 mb-3">
                        <FileText className="h-5 w-5 text-emerald-600/80" />
                        <span className="text-sm font-medium text-emerald-700/90 bg-emerald-100/70 px-2 py-1 rounded-full">
                            {article.category}
                        </span>
                    </div>
                    <CardTitle className="text-lg font-bold text-slate-800 group-hover:text-emerald-700/90 transition-colors line-clamp-2 leading-tight">
                        {article.title}
                    </CardTitle>
                </div>
                
                {/* Content */}
                <CardContent className="p-6 flex-grow">
                    <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 mb-4">
                        {excerpt}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{article.author}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{articleDate}</span>
                        </div>
                    </div>
                </CardContent>
                
                {/* Footer */}
                <CardFooter className="p-6 pt-0">
                    <Button 
                        asChild 
                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-medium transition-all duration-200 transform hover:scale-105"
                    >
                        <Link href={`/makaleler/${article.id}`}>
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
    const [categories, setCategories] = useState([]);
    const [articles, setArticles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalArticles, setTotalArticles] = useState(0);
    
    const ARTICLES_PER_PAGE = 12; // Sayfa başına makale sayısı

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/articles/by-category`);
                if (!response.ok) {
                    throw new Error("Kategoriler alınamadı.");
                }
                const data = await response.json();
                const categoryList = Object.keys(data || {});
                setCategories(categoryList);
            } catch (error) {
                console.error("Kategori fetch hatası:", error);
            }
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        const fetchArticles = async () => {
            setIsLoading(true);
            try {
                // API parametrelerini hazırla
                const params = new URLSearchParams({
                    page: currentPage,
                    limit: ARTICLES_PER_PAGE,
                    search: searchTerm,
                    category: selectedCategory !== "all" ? selectedCategory : ""
                });

                const response = await fetch(`${API_BASE_URL}/articles/paginated?${params}`);
                if (!response.ok) {
                    throw new Error("Makaleler alınamadı.");
                }
                
                const data = await response.json();
                setArticles(data.articles || []);
                setTotalPages(data.total_pages || 0);
                setTotalArticles(data.total_articles || 0);
                
            } catch (error) {
                setError(error.message);
                setArticles([]);
                setTotalPages(0);
                setTotalArticles(0);
            } finally {
                setIsLoading(false);
            }
        };

        // Debounce search - arama 500ms sonra tetiklensin
        const timeoutId = setTimeout(() => {
            fetchArticles();
        }, searchTerm ? 500 : 0);

        return () => clearTimeout(timeoutId);
    }, [currentPage, searchTerm, selectedCategory]);

    // Sayfa değiştiğinde üst kısma scroll
    useEffect(() => {
        if (currentPage > 1) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentPage]);

    // Search veya category değiştiğinde sayfa 1'e dön
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCategory]);

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
                            {/* Category */}
                            <div>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="w-full h-11 text-base border-slate-300 focus:border-[#177267] focus:ring-0">
                                        <SelectValue placeholder="Kategori seçin..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tüm Kategoriler</SelectItem>
                                        {categories.map(category => (
                                            <SelectItem key={category} value={category}>{category}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Search */}
                            <div className="relative w-full">
                                <Input 
                                    placeholder="Başlık veya yazar ile ara..." 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                    className="w-full h-11 pl-4 border-slate-300 focus:border-[#177267] focus:ring-0"
                                />
                            </div>
                        </div>
                        {/* Suggestions */}
                        <div className="flex flex-wrap gap-2 mt-3">
                            {["Tasavvuf", "Ahlak", "Fıkıh", "Maneviyat", "İlim"].map((label) => (
                                <button key={label} onClick={() => setSearchTerm(label)} className="px-3 py-1.5 text-sm rounded-full border border-slate-300 text-[#177267] hover:bg-slate-50">
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Results */}
                <main className="max-w-6xl mx-auto">
                    {articles.length > 0 ? (
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
                                        <span className="text-emerald-600 font-semibold">{articles.length}</span> makale gösteriliyor
                                    </p>
                                    <span className="w-px h-4 bg-slate-300"></span>
                                    <p>
                                        <span className="text-emerald-600 font-semibold">{totalArticles}</span> toplam makale
                                    </p>
                                    <span className="w-px h-4 bg-slate-300"></span>
                                    <p>
                                        Sayfa <span className="text-emerald-600 font-semibold">{currentPage}</span> / <span className="text-emerald-600 font-semibold">{totalPages}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {articles.map((article, index) => (
                                    <ArticleCard 
                                        key={article.id} 
                                        article={article} 
                                        index={index}
                                        query={searchTerm}
                                    />
                                ))}
                            </div>
                            
                            {/* Pagination */}
                            <PaginationComponent />
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