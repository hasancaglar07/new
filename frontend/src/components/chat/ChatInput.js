"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Loader2, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from './ChatProvider';

// Soru önerileri
const QUESTION_SUGGESTIONS = [
  "Rabıta nedir ve nasıl yapılır?",
  "Nefis terbiyesi nasıl olur?",
  "Zikir çeşitleri nelerdir?",
  "Mürşit-mürit ilişkisi nasıl olmalı?",
  "Fena ve beka kavramları nedir?",
  "Manevi makamlar nelerdir?"
];

export default function ChatInput({ onSendMessage, disabled = false }) {
  const { 
    isLoading, 
    addMessage,
    MESSAGE_TYPES 
  } = useChat();
  
  const [inputText, setInputText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef(null);
  
  // Textarea otomatik boyutlandırma
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120); // Max 120px
      textarea.style.height = `${newHeight}px`;
    }
  }, []);
  
  useEffect(() => {
    adjustTextareaHeight();
  }, [inputText, adjustTextareaHeight]);
  
  // Mesaj gönderme
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading || disabled) return;
    
    const messageText = inputText.trim();
    setInputText('');
    
    // Sadece parent component'e bildir - duplicate mesaj önlemek için
    onSendMessage?.(messageText);
  }, [inputText, isLoading, disabled, onSendMessage]);

  const handleInputChange = useCallback((e) => {
    setInputText(e.target.value);
  }, []);

  // Soru önerisi seçme
  const handleSuggestionClick = useCallback((suggestion) => {
    setInputText(suggestion);
    setShowSuggestions(false);
    // Direkt gönder
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  }, [handleSendMessage]);

  const canSend = inputText.trim() && !isLoading && !disabled;
  
  // Enter tuşu ile gönderme
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);
  
  return (
    <div className="space-y-3">
      {/* Soru Önerileri */}
      {showSuggestions && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QUESTION_SUGGESTIONS.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-left justify-start h-auto p-3 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 border-gray-200"
            >
              {suggestion}
            </Button>
          ))}
        </div>
      )}
      
      <div className="flex items-end gap-3">
        {/* Metin giriş alanı */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Mihmandar size nasıl yardımcı olabilir?"
            disabled={isLoading || disabled}
            className="w-full min-h-[50px] max-h-[120px] px-4 py-3 bg-white border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 disabled:opacity-50 text-gray-900 placeholder-gray-500 text-base leading-relaxed transition-all duration-200"
            rows={1}
            style={{
              fontSize: typeof window !== 'undefined' && window.innerWidth < 640 ? '16px' : undefined
            }}
          />
        </div>
        
        {/* Soru önerileri butonu */}
        <Button
          onClick={() => setShowSuggestions(!showSuggestions)}
          variant="outline"
          size="icon"
          className="w-10 h-10 border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        >
          <Lightbulb className="w-4 h-4" />
        </Button>
        
        {/* Gönder butonu */}
        <Button
          onClick={handleSendMessage}
          disabled={!canSend}
          size="icon"
          className="w-10 h-10 bg-gray-900 hover:bg-gray-800 text-white rounded-full transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}