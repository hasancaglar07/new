// frontend/src/app/makaleler/[id]/page.js

"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, User, Library, Loader2, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// --- Yüklenme İskeleti Bileşeni ---
function ArticleSkeleton() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-12 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-1/4 mb-10"></div>
            <div className="h-12 bg-slate-300 rounded w-full mb-6"></div>
            <div className="flex items-center space-x-6 mb-8">
                <div className="h-5 bg-slate-200 rounded w-1/3"></div>
                <div className="h-5 bg-slate-200 rounded w-1/3"></div>
            </div>
            <div className="space-y-4 mt-10">
                <div className="h-5 bg-slate-200 rounded w-full"></div>
                <div className="h-5 bg-slate-200 rounded w-full"></div>
                <div className="h-5 bg-slate-200 rounded w-5/6"></div>
                <div className="h-20 bg-slate-200 rounded w-full mt-6"></div>
                <div className="h-5 bg-slate-200 rounded w-full"></div>
            </div>
        </div>
    );
}

// --- Hata Durumu Bileşeni ---
function ErrorState({ message }) {
    return (
        <div className="text-center py-20 px-6 bg-red-50/80 rounded-2xl mt-8 max-w-2xl mx-auto">
            <ServerCrash className="mx-auto h-16 w-16 text-red-400 mb-4" />
            <h3 className="text-2xl font-bold text-red-800">Makale Yüklenemedi</h3>
            <p className="text-red-600 mt-2">{message}</p>
            <Button asChild className="mt-6">
                <Link href="/makaleler"><ArrowLeft className="mr-2 h-4 w-4" /> Makale Listesine Dön</Link>
            </Button>
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
        <div className="bg-white min-h-screen">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ duration: 0.8 }}
                className="max-w-3xl mx-auto px-4 py-12 md:py-20"
            >
                <div className="mb-10">
                    <Button asChild variant="ghost" className="text-slate-600 hover:text-slate-900">
                        <Link href="/makaleler">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Tüm Makaleler
                        </Link>
                    </Button>
                </div>

                <article>
                    <header className="mb-8">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight mb-6">
                            {article.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-500">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>{article.author}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Library className="h-4 w-4" />
                                <span>{article.category}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <time dateTime={article.scraped_at}>{articleDate}</time>
                            </div>
                        </div>
                    </header>
                    
                    <Separator className="my-8" />
                    
                    {/* Makale içeriğini HTML olarak render etmek için */}
                    <div
                        className="prose prose-lg max-w-none prose-p:text-slate-700 prose-h2:text-slate-800 prose-a:text-emerald-600 hover:prose-a:text-emerald-700"
                        dangerouslySetInnerHTML={{ __html: article.content }}
                    />
                </article>
            </motion.div>
        </div>
    );
}

// Tailwind'in `prose` eklentisini kullanabilmek için
// `tailwind.config.js` dosyasına bir eklenti eklememiz gerekebilir.
// Eğer metinler stillenmemiş görünürse, bu adımı uygulayacağız.