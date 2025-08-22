"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Loader2, Lightbulb, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from './ChatProvider';
import { motion, AnimatePresence } from 'framer-motion';

// Google tarzı otomatik tamamlama önerileri
const AUTO_COMPLETE_SUGGESTIONS = [
  "Rabıta nedir ve nasıl yapılır?",
  "Nefis terbiyesi nasıl olur?",
  "Zikir çeşitleri nelerdir?",
  "Mürşit-mürit ilişkisi nasıl olmalı?",
  "Fena ve beka kavramları nedir?",
  "Manevi makamlar nelerdir?",
  "Tasavvuf nedir?",
  "Namaz nasıl kılınır?",
  "Dua etmenin adabı nedir?",
  "İslam'da sabır kavramı",
  "Kur'an okuma adabı",
  "Tesbih çekmenin faydaları"
];

// Kullanıcı yazarken dinamik öneriler
const getDynamicSuggestions = (input) => {
  if (!input.trim()) return AUTO_COMPLETE_SUGGESTIONS.slice(0, 6);
  
  const filtered = AUTO_COMPLETE_SUGGESTIONS.filter(suggestion => 
    suggestion.toLowerCase().includes(input.toLowerCase())
  );
  
  // Eğer tam eşleşme yoksa, input'a dayalı tamamlama önerileri oluştur
  if (filtered.length === 0) {
    return [
      `${input} nedir?`,
      `${input} nasıl yapılır?`,
      `${input} hakkında bilgi ver`,
      `${input} konusunda yardım et`
    ];
  }
  
  return filtered.slice(0, 6);
};

function ChatInput({ onSendMessage, disabled = false }) {
  const { isLoading } = useChat();
  
  const [inputText, setInputText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const textareaRef = useRef(null);
  
  // Textarea otomatik boyutlandırma
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);
  
  useEffect(() => {
    adjustTextareaHeight();
  }, [inputText, adjustTextareaHeight]);
  
  // Dinamik önerileri güncelle
  useEffect(() => {
    const newSuggestions = getDynamicSuggestions(inputText);
    setSuggestions(newSuggestions);
    setSelectedIndex(-1);
  }, [inputText]);
  
  // Mesaj gönderme
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading || disabled) return;
    
    const messageText = inputText.trim();
    setInputText('');
    setShowSuggestions(false);
    onSendMessage?.(messageText);
  }, [inputText, isLoading, disabled, onSendMessage]);

  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setInputText(value);
    
    // Akıllı doldurma için önerileri güncelle
    if (value.length > 2) {
      const newSuggestions = getDynamicSuggestions(value);
      setSuggestions(newSuggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, []);

  // Öneri seçme
  const handleSuggestionClick = useCallback((suggestion) => {
    setInputText(suggestion);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  }, []);

  const canSend = inputText.trim() && !isLoading && !disabled;
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSendMessage();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  }, [showSuggestions, suggestions, selectedIndex, handleSuggestionClick, handleSendMessage]);
  
  return (
    <div className="relative space-y-4">
      {/* Akıllı Doldurma Önerileri */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl border border-emerald-200 shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto"
          >
            <div className="p-2">
              <div className="text-xs text-emerald-600 font-medium mb-2 px-2">Akıllı Öneriler</div>
              {suggestions.map((suggestion, index) => {
                const isSelected = index === selectedIndex;
                const isPartialMatch = inputText && suggestion.toLowerCase().includes(inputText.toLowerCase());
                
                return (
                  <div
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`px-3 py-2 cursor-pointer transition-colors duration-100 rounded-lg ${
                      isSelected 
                        ? 'bg-emerald-100 text-emerald-900' 
                        : 'text-gray-700 hover:bg-emerald-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-sm font-medium">
                        {isPartialMatch && inputText ? (
                          <>
                            {suggestion.split(new RegExp(`(${inputText})`, 'gi')).map((part, i) => 
                              part.toLowerCase() === inputText.toLowerCase() ? (
                                <mark key={i} className="bg-emerald-200 text-emerald-900 font-semibold rounded px-1">{part}</mark>
                              ) : (
                                <span key={i}>{part}</span>
                              )
                            )}
                          </>
                        ) : (
                          suggestion
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
        
        <div className="flex items-end gap-3">
        {/* Modern 2025 Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
               if (inputText.length > 2) {
                 setShowSuggestions(true);
               }
             }}
             onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Mihmandar'a sorunuzu yazın..."
            disabled={isLoading || disabled}
            className="w-full min-h-[60px] max-h-[120px] px-6 py-4 bg-white border-2 border-gray-200 rounded-3xl resize-none focus:outline-none focus:border-emerald-500 disabled:opacity-50 text-gray-900 placeholder-gray-500 text-lg leading-relaxed transition-all duration-300 shadow-sm font-normal hover:border-gray-300"
            rows={1}
          />
          
          {/* Input Enhancement */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            {inputText && (
              <button
                onClick={() => {
                  setInputText('');
                  setShowSuggestions(false);
                  textareaRef.current?.focus();
                }}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Modern Send Button */}
        <Button
          onClick={handleSendMessage}
          disabled={!canSend}
          size="icon"
          className="w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-all duration-200 disabled:opacity-50 disabled:bg-gray-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Send className="w-6 h-6" />
          )}
        </Button>
      </div>
    </div>
  );
}

export default ChatInput;