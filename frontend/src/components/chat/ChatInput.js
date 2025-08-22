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

function ChatInput({ onSendMessage, disabled = false }) {
  const { isLoading } = useChat();
  
  const [inputText, setInputText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
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
  
  // Mesaj gönderme
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading || disabled) return;
    
    const messageText = inputText.trim();
    setInputText('');
    onSendMessage?.(messageText);
  }, [inputText, isLoading, disabled, onSendMessage]);

  const handleInputChange = useCallback((e) => {
    setInputText(e.target.value);
  }, []);

  // Soru önerisi seçme
  const handleSuggestionClick = useCallback((suggestion) => {
    setInputText(suggestion);
    setShowSuggestions(false);
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
    <div className="space-y-4">
      {/* Soru Önerileri */}
      {showSuggestions && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {QUESTION_SUGGESTIONS.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-left justify-start h-auto p-4 text-sm text-gray-700 hover:text-emerald-800 hover:bg-emerald-50/70 border-gray-200 hover:border-emerald-300 rounded-xl transition-all duration-200"
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
            className="w-full min-h-[60px] max-h-[120px] px-6 py-4 bg-white border border-gray-300 rounded-3xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 disabled:opacity-50 text-gray-900 placeholder-gray-500 text-lg leading-relaxed transition-all duration-200 shadow-sm"
            rows={1}
          />
        </div>
        
        {/* Soru önerileri butonu */}
        <Button
          onClick={() => setShowSuggestions(!showSuggestions)}
          variant="outline"
          size="icon"
          className="w-14 h-14 border-gray-300 text-gray-600 hover:text-emerald-800 hover:bg-emerald-50/70 hover:border-emerald-300 rounded-2xl transition-all duration-200"
        >
          <Lightbulb className="w-6 h-6" />
        </Button>
        
        {/* Gönder butonu */}
        <Button
          onClick={handleSendMessage}
          disabled={!canSend}
          size="icon"
          className="w-14 h-14 bg-gradient-to-r from-emerald-700 to-green-800 hover:from-emerald-800 hover:to-green-900 text-white rounded-2xl transition-all duration-200 disabled:opacity-50 shadow-lg disabled:shadow-none"
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