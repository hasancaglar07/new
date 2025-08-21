'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, X, Clock, MessageSquare, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ChatHistory({ isOpen, onClose, onSelectChat, searchQuery = '' }) {
  const [chatHistory, setChatHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [displayCount, setDisplayCount] = useState(10);

  // Fetch chat history from Supabase AI history
  const fetchChatHistory = async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/ai-history/recent?limit=20`);
      if (response.ok) {
        const data = await response.json();
        const chats = data.data || [];
        
        // Format for compatibility
        const formattedChats = chats.map(chat => ({
          id: chat.chat_id,
          question: chat.question,
          answer: chat.answer,
          slug: chat.slug,
          timestamp: chat.created_at,
          sources: chat.sources || []
        }));
        
        if (append) {
          setChatHistory(prev => [...prev, ...formattedChats]);
        } else {
          setChatHistory(formattedChats);
        }
        setHasMore(false); // For now, load all at once
      }
    } catch (error) {
      console.error('Failed to fetch AI chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter chat history based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredHistory(chatHistory);
    } else {
      const filtered = chatHistory.filter(chat => {
        const question = chat.question || '';
        const answer = chat.answer || '';
        return question.toLowerCase().includes(searchQuery.toLowerCase()) ||
               answer.toLowerCase().includes(searchQuery.toLowerCase());
      });
      setFilteredHistory(filtered);
    }
    setDisplayCount(10); // Reset display count when search changes
  }, [chatHistory, searchQuery]);

  // Load initial data when opened
  useEffect(() => {
    if (isOpen) {
      fetchChatHistory(1, false);
      setPage(1);
    }
  }, [isOpen]);

  // Lazy load more items
  const loadMoreItems = () => {
    setDisplayCount(prev => prev + 10);
  };

  // Load more chats
  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchChatHistory(nextPage, true);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Bugün';
    } else if (diffDays === 2) {
      return 'Dün';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} gün önce`;
    } else {
      return date.toLocaleDateString('tr-TR');
    }
  };

  // Truncate text
  const truncateText = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {loading && chatHistory.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 text-sm">
              {searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz sohbet geçmişi yok'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {searchQuery ? 'Farklı kelimeler deneyin' : 'İlk sorunuzu sorarak başlayın!'}
            </p>
          </div>
        ) : (
          <>
            {filteredHistory.slice(0, displayCount).map((chat, index) => (
              <div
                key={chat.id || index}
                className="bg-gray-50 hover:bg-gray-100 rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-all duration-200 cursor-pointer"
                onClick={() => {
                     onSelectChat?.(chat);
                     onClose();
                   }}
                 >
                 {/* Question */}
                 <div className="mb-2">
                   <div className="flex items-start gap-2">
                     <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                     <p className="text-sm font-medium text-gray-900 leading-relaxed">
                       {truncateText(chat.question)}
                     </p>
                   </div>
                 </div>

                 {/* Metadata */}
                 <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                   <div className="flex items-center gap-1">
                     <Clock className="w-3 h-3" />
                     <span>{formatDate(chat.timestamp)}</span>
                   </div>
                   {chat.sources && chat.sources.length > 0 && (
                     <div className="flex items-center gap-1">
                       <ExternalLink className="w-3 h-3" />
                       <span>{chat.sources.length} kaynak</span>
                     </div>
                   )}
                 </div>
               </div>
             ))}

             {/* Load More Button */}
              {displayCount < filteredHistory.length && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadMoreItems}
                    className="text-gray-600 border-gray-300 hover:bg-gray-50 w-full"
                  >
                    Daha Fazla Göster ({filteredHistory.length - displayCount} kaldı)
                  </Button>
                </div>
              )}
              
              {/* Show total count */}
              {filteredHistory.length > 0 && (
                <div className="text-center pt-2 pb-4">
                  <p className="text-xs text-gray-500">
                    {displayCount} / {filteredHistory.length} sohbet gösteriliyor
                  </p>
                </div>
              )}
           </>
         )}
       </div>
     </div>
   );
}