// frontend/src/app/makaleler/page.js

"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Library, Loader2, ServerCrash, BookText } from 'lucide-react';

// ShadCN UI ve Yerel Bileşenler
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// --- Yüklenme İskeleti Bileşeni ---
function ArticlesSkeleton() {
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="text-center mb-12">
                <div className="h-10 bg-slate-200 rounded-lg w-1/2 mx-auto animate-pulse"></div>
                <div className="h-5 bg-slate-200 rounded-md w-1/3 mx-auto mt-4 animate-pulse"></div>
            </div>
            <div className="max-w-3xl mx-auto space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-slate-200 rounded-xl animate-pulse"></div>
                ))}
            </div>
        </div>
    );
}

// --- Hata Durumu Bileşeni ---
function ErrorState({ message }) {
    return (
        <div className="text-center py-20 px-6 bg-red-50/80 rounded-2xl mt-8 max-w-2xl mx-auto">
            <ServerCrash className="mx-auto h-16 w-16 text-red-400 mb-4" />
            <h3 className="text-2xl font-bold text-red-800">Bir Hata Oluştu</h3>
            <p className="text-red-600 mt-2">{message}</p>
        </div>
    );
}

// --- ANA MAKALELER SAYFASI ---
export default function ArticlesPage() {
    const [articlesData, setArticlesData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/articles/by-category`);
                if (!response.ok) {
                    throw new Error("Makaleler sunucudan alınamadı. Lütfen daha sonra tekrar deneyin.");
                }
                const data = await response.json();
                setArticlesData(data || {});
            } catch (error) {
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchArticles();
    }, []);

    if (isLoading) return <ArticlesSkeleton />;
    if (error) return <ErrorState message={error} />;

    const categories = Object.keys(articlesData);

    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="container mx-auto px-4 py-12 md:py-20">
                <motion.header 
                    initial={{ opacity: 0, y: -20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.5 }} 
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-slate-800">Makaleler Kütüphanesi</h1>
                    <p className="mt-4 text-lg md:text-xl text-slate-600">Sitede yayınlanan tüm yazılara göz atın.</p>
                </motion.header>

                <main className="max-w-3xl mx-auto">
                    {categories.length > 0 ? (
                        <Accordion type="multiple" className="w-full space-y-4">
                            {categories.map((category, index) => (
                                <motion.div 
                                    key={category}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                >
                                    <AccordionItem value={`item-${index}`} className="border bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                        <AccordionTrigger className="px-6 py-4 text-xl font-bold text-slate-700 hover:no-underline">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-emerald-100 rounded-lg">
                                                    <Library className="h-6 w-6 text-emerald-600" />
                                                </div>
                                                <span>{category}</span>
                                                <span className="px-2.5 py-0.5 bg-slate-200 text-slate-600 text-sm font-semibold rounded-full">
                                                    {articlesData[category].length}
                                                </span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pb-4">
                                            <ul className="space-y-1 border-t pt-4">
                                                {articlesData[category].map(article => (
                                                    <li key={article.id}>
                                                        <Link 
                                                            href={`/makaleler/${article.id}`} 
                                                            className="flex items-start gap-3 p-3 rounded-lg text-slate-600 hover:bg-slate-100/80 transition-colors"
                                                        >
                                                            <BookText className="h-5 w-5 mt-0.5 text-slate-400 shrink-0" />
                                                            <span className="flex-grow">{article.title}</span>
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        </AccordionContent>
                                    </AccordionItem>
                                </motion.div>
                            ))}
                        </Accordion>
                    ) : (
                        <Card className="text-center p-10">
                            <CardHeader>
                                <CardTitle>Makale Bulunamadı</CardTitle>
                                <CardDescription>Veritabanında henüz hiç makale bulunmuyor.</CardDescription>
                            </CardHeader>
                        </Card>
                    )}
                </main>
            </div>
        </div>
    );
}