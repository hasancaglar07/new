"use client";

import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

// Sohbet durumu için context
const ChatContext = createContext();

// Action türleri
const CHAT_ACTIONS = {
  ADD_MESSAGE: 'ADD_MESSAGE',
  UPDATE_MESSAGE: 'UPDATE_MESSAGE',
  DELETE_MESSAGE: 'DELETE_MESSAGE',
  SET_LOADING: 'SET_LOADING',
  SET_RECORDING: 'SET_RECORDING',
  SET_SPEAKING: 'SET_SPEAKING',
  CLEAR_CHAT: 'CLEAR_CHAT',
  LOAD_CHAT_HISTORY: 'LOAD_CHAT_HISTORY',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Mesaj türleri
export const MESSAGE_TYPES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
};

// Kaynak türleri
export const SOURCE_TYPES = {
  BOOK: 'book',
  ARTICLE: 'article',
  AUDIO: 'audio',
  VIDEO: 'video'
};

// İlk durum
const initialState = {
  messages: [
    {
      id: 'welcome-1',
      type: MESSAGE_TYPES.ASSISTANT,
      content: "Selamın Aleyküm Gönül Dostum🌹ben mihmandar akıllı asistanım, Sana nasıl yardımcı olabilirim ?",
      timestamp: new Date(),
      sources: [],
      isWelcome: true,
      isTypewriter: true
    }
  ],
  isLoading: false,
  isRecording: false,
  isSpeaking: false,
  recordingTime: 0,
  error: null,
  sessionId: null
};

// Reducer fonksiyonu
function chatReducer(state, action) {
  switch (action.type) {
    case CHAT_ACTIONS.ADD_MESSAGE:
      return {
        ...state,
        messages: [...state.messages, action.payload],
        error: null
      };
      
    case CHAT_ACTIONS.UPDATE_MESSAGE:
      return {
        ...state,
        messages: state.messages.map(msg => 
          msg.id === action.payload.id 
            ? { ...msg, ...action.payload.updates }
            : msg
        )
      };
      
    case CHAT_ACTIONS.DELETE_MESSAGE:
      return {
        ...state,
        messages: state.messages.filter(msg => msg.id !== action.payload)
      };
      
    case CHAT_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
      
    case CHAT_ACTIONS.SET_RECORDING:
      return {
        ...state,
        isRecording: action.payload.isRecording,
        recordingTime: action.payload.recordingTime || 0
      };
      
    case CHAT_ACTIONS.SET_SPEAKING:
      return {
        ...state,
        isSpeaking: action.payload
      };
      
    case CHAT_ACTIONS.CLEAR_CHAT:
      // Clear localStorage
      try {
        const currentSessionKey = `mihmandar_chat_${state.sessionId}`;
        localStorage.removeItem(currentSessionKey);
      } catch (error) {
        console.warn('localStorage temizlenemedi:', error);
      }
      
      return {
        ...state,
        messages: [
          {
            id: 'welcome-' + Date.now(),
            type: MESSAGE_TYPES.ASSISTANT,
            content: "Selamın Aleyküm Gönül Dostum🌹ben mihmandar akıllı asistanım, Sana nasıl yardımcı olabilirim ?",
            timestamp: new Date(),
            sources: [],
            isWelcome: true,
            isTypewriter: true
          }
        ],
        error: null,
        sessionId: generateSessionId()
      };
      
    case CHAT_ACTIONS.LOAD_CHAT_HISTORY:
      return {
        ...state,
        messages: action.payload.messages || initialState.messages,
        sessionId: action.payload.sessionId
      };
      
    case CHAT_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
      
    case CHAT_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
      
    default:
      return state;
  }
}

// Session ID oluşturucu
function generateSessionId() {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Chat Provider bileşeni
export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, {
    ...initialState,
    sessionId: generateSessionId()
  });
  
  // Mesaj ekleme
  const addMessage = useCallback((message) => {
    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      sources: [],
      ...message
    };
    
    dispatch({
      type: CHAT_ACTIONS.ADD_MESSAGE,
      payload: newMessage
    });
    
    return newMessage.id;
  }, []);
  
  // Mesaj güncelleme
  const updateMessage = useCallback((messageId, updates) => {
    dispatch({
      type: CHAT_ACTIONS.UPDATE_MESSAGE,
      payload: { id: messageId, updates }
    });
  }, []);
  
  // Mesaj silme
  const deleteMessage = useCallback((messageId) => {
    dispatch({
      type: CHAT_ACTIONS.DELETE_MESSAGE,
      payload: messageId
    });
  }, []);
  
  // Yükleme durumu
  const setLoading = useCallback((isLoading) => {
    dispatch({
      type: CHAT_ACTIONS.SET_LOADING,
      payload: isLoading
    });
  }, []);
  
  // Kayıt durumu
  const setRecording = useCallback((isRecording, recordingTime = 0) => {
    dispatch({
      type: CHAT_ACTIONS.SET_RECORDING,
      payload: { isRecording, recordingTime }
    });
  }, []);
  
  // Konuşma durumu
  const setSpeaking = useCallback((isSpeaking) => {
    dispatch({
      type: CHAT_ACTIONS.SET_SPEAKING,
      payload: isSpeaking
    });
  }, []);
  
  // Sohbeti temizle
  const clearChat = useCallback(() => {
    // Tüm mihmandar chat verilerini localStorage'dan temizle
    try {
      const keysToRemove = Object.keys(localStorage)
        .filter(key => key.startsWith('mihmandar_chat_'));
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.log('localStorage temizlendi:', keysToRemove.length, 'öğe silindi');
    } catch (error) {
      console.warn('localStorage temizlenemedi:', error);
    }
    
    dispatch({ type: CHAT_ACTIONS.CLEAR_CHAT });
  }, []);
  
  // Hata yönetimi
  const setError = useCallback((error) => {
    dispatch({
      type: CHAT_ACTIONS.SET_ERROR,
      payload: error
    });
  }, []);
  
  const clearError = useCallback(() => {
    dispatch({ type: CHAT_ACTIONS.CLEAR_ERROR });
  }, []);
  
  // Sohbet geçmişini yükle
  const loadChatHistory = useCallback((chatData) => {
    dispatch({
      type: CHAT_ACTIONS.LOAD_CHAT_HISTORY,
      payload: chatData
    });
  }, []);
  
  // Local storage'a kaydet - GEÇİCİ OLARAK KAPALI
  useEffect(() => {
    // localStorage kaydetme geçici olarak devre dışı
    console.log('localStorage kaydetme devre dışı - anlık geliştirme modu');
    return; // Erken çıkış
    
    if (state.sessionId && state.messages.length > 1) {
      try {
        const chatData = {
          sessionId: state.sessionId,
          messages: state.messages,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(`mihmandar_chat_${state.sessionId}`, JSON.stringify(chatData));
      } catch (error) {
        console.warn('Sohbet geçmişi kaydedilemedi:', error);
      }
    }
  }, [state.messages, state.sessionId]);
  
  // Sayfa yüklendiğinde son sohbeti geri yükle - GEÇİCİ OLARAK KAPALI
  useEffect(() => {
    // localStorage yükleme geçici olarak devre dışı
    console.log('localStorage yükleme devre dışı - geliştirme modu');
    return; // Erken çıkış
    
    try {
      const savedChats = Object.keys(localStorage)
        .filter(key => key.startsWith('mihmandar_chat_'))
        .map(key => {
          try {
            return JSON.parse(localStorage.getItem(key));
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      if (savedChats.length > 0) {
        const lastChat = savedChats[0];
        // Sadece son 24 saat içindeki sohbetleri geri yükle
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (new Date(lastChat.timestamp) > dayAgo) {
          loadChatHistory(lastChat);
        }
      }
    } catch (error) {
      console.warn('Sohbet geçmişi yüklenemedi:', error);
    }
  }, [loadChatHistory]);
  
  // Geliştirme için tüm localStorage'ı temizle
  useEffect(() => {
    // Sayfa yüklendiğinde tüm mihmandar verilerini temizle
    try {
      const keysToRemove = Object.keys(localStorage)
        .filter(key => key.startsWith('mihmandar_'));
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      if (keysToRemove.length > 0) {
        console.log('🧹 Geliştirme modu: localStorage temizlendi -', keysToRemove.length, 'öğe silindi');
      }
    } catch (error) {
      console.warn('localStorage temizlenemedi:', error);
    }
  }, []); // Sadece component mount olduğunda çalışır
  
  const value = {
    // State
    ...state,
    
    // Actions
    addMessage,
    updateMessage,
    deleteMessage,
    setLoading,
    setRecording,
    setSpeaking,
    clearChat,
    setError,
    clearError,
    loadChatHistory,
    
    // Constants
    MESSAGE_TYPES,
    SOURCE_TYPES
  };
  
  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

// Hook
export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}