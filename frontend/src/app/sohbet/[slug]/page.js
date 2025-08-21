"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, User, MessageCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import MessageComponent from '@/components/chat/MessageComponent';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function ChatPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/30 via-teal-50/20 to-green-50/30">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="h-10 bg-emerald-200 rounded-lg w-32 mb-8 animate-pulse"></div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-emerald-200/50 p-8 mb-8 animate-pulse">
          <div className="h-8 bg-slate-300 rounded-lg w-3/4 mb-6 animate-pulse"></div>
          <div className="h-6 bg-slate-200 rounded-lg w-1/2 mb-4 animate-pulse"></div>
          <div className="h-32 bg-slate-100 rounded-lg w-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/30 via-teal-50/20 to-green-50/30">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="bg-red-50 border border-red-200 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-red-800 mb-4">Sohbet Bulunamadı</h2>
            <p className="text-red-600 mb-6">{message}</p>
            <Button asChild>
              <Link href="/sohbet">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Ana Sohbet Sayfası
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function ChatSlugPage() {
  const params = useParams();
  const slug = params.slug;
  
  const [chatData, setChatData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChatData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/sohbet/${slug}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Bu sohbet bulunamadı.');
          } else {
            setError('Sohbet yüklenirken bir hata oluştu.');
          }
          return;
        }
        
        const data = await response.json();
        setChatData(data.data);
        
        // SEO meta tags güncelle
        if (data.data.meta) {
          document.title = data.data.meta.title;
          
          // Meta description
          let metaDescription = document.querySelector('meta[name="description"]');
          if (!metaDescription) {
            metaDescription = document.createElement('meta');
            metaDescription.name = 'description';
            document.head.appendChild(metaDescription);
          }
          metaDescription.content = data.data.meta.description;
          
          // Meta keywords
          let metaKeywords = document.querySelector('meta[name="keywords"]');
          if (!metaKeywords) {
            metaKeywords = document.createElement('meta');
            metaKeywords.name = 'keywords';
            document.head.appendChild(metaKeywords);
          }
          metaKeywords.content = data.data.meta.keywords;
        }
        
      } catch (err) {
        console.error('Sohbet yükleme hatası:', err);
        setError('Sohbet yüklenirken bir hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchChatData();
    }
  }, [slug]);

  if (isLoading) return <ChatPageSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!chatData) return <ErrorState message="Sohbet verisi bulunamadı." />;

  const { chat, meta } = chatData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/30 via-teal-50/20 to-green-50/30">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back Button */}
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
            <Link href="/sohbet">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Yeni Sohbet Başlat
            </Link>
          </Button>
        </motion.div>

        {/* Chat Content */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {/* Header */}
          <header className="bg-white/80 backdrop-blur-sm rounded-2xl border border-emerald-200/50 p-8 mb-8 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <MessageCircle className="h-6 w-6 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700 bg-emerald-100/70 px-3 py-1.5 rounded-full">
                AI Sohbet
              </span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-6">
              {chat.question}
            </h1>
            
            <div className="flex items-center gap-6 text-slate-600">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  {new Date(chat.created_at).toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-sm">Mihmandar AI</span>
              </div>
            </div>
          </header>

          {/* Chat Messages */}
          <div className="space-y-6">
            {/* User Question */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <MessageComponent
                message={{
                  id: 'user-question',
                  type: 'user',
                  content: chat.question,
                  timestamp: new Date(chat.created_at)
                }}
                onSourceClick={() => {}}
                onFeedback={() => {}}
              />
            </motion.div>

            {/* AI Response */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <MessageComponent
                message={{
                  id: 'ai-response',
                  type: 'assistant',
                  content: chat.answer,
                  sources: chat.sources || [],
                  timestamp: new Date(chat.created_at)
                }}
                onSourceClick={(source) => {
                  // Kaynak tıklama işlemi
                  if (source.url) {
                    window.open(source.url, '_blank');
                  }
                }}
                onFeedback={() => {}}
              />
            </motion.div>
          </div>

          {/* Footer Actions */}
          <motion.footer
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-12 pt-8 border-t border-emerald-200/50"
          >
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="flex gap-3">
                <Button asChild className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white">
                  <Link href="/sohbet">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Yeni Sohbet Başlat
                  </Link>
                </Button>
                
                <Button asChild variant="outline" className="border-emerald-200 hover:bg-emerald-50 text-emerald-700">
                  <Link href="/">
                    Ana Sayfa
                  </Link>
                </Button>
              </div>
              
              <div className="text-sm text-slate-500">
                Sohbet ID: {chat.chat_id}
              </div>
            </div>
          </motion.footer>
        </motion.article>
      </div>
    </div>
  );
}