"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

// Deepgram hook for real-time speech-to-text
export function useDeepgram() {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [isReady, setIsReady] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  
  // Refs
  const deepgramRef = useRef(null);
  const connectionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const keepAliveRef = useRef(null);
  
  // Deepgram configuration
  const deepgramConfig = {
    model: 'nova-2',
    language: 'tr',
    smart_format: true,
    punctuate: true,
    interim_results: true,
    endpointing: 300,
    vad_events: true,
    encoding: 'linear16',
    sample_rate: 16000,
    channels: 1
  };
  
  // Initialize Deepgram client
  const initializeDeepgram = useCallback(async () => {
    try {
      // Try to get temporary key first
      const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
      
      if (!apiKey || apiKey === 'your_deepgram_api_key_here') {
        console.log('Deepgram API key not configured, using fallback');
        setError('Deepgram API key yapılandırılmamış - Lütfen .env.local dosyasına gerçek API key ekleyin');
        setIsReady(false);
        return false;
      }
      
      try {
        const response = await fetch('/api/deepgram/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const { key } = await response.json();
          deepgramRef.current = createClient(key);
        } else {
          throw new Error('Token endpoint failed');
        }
      } catch (tokenError) {
        console.log('Token endpoint failed, using direct API key');
        deepgramRef.current = createClient(apiKey);
      }
      
      setIsReady(true);
      return true;
    } catch (error) {
      console.error('Deepgram initialization error:', error);
      setError('Deepgram bağlantısı kurulamadı - API key kontrol edin');
      setIsReady(false);
      return false;
    }
  }, []);
  
  // Connect to Deepgram
  const connect = useCallback(async () => {
    if (!deepgramRef.current) {
      const initialized = await initializeDeepgram();
      if (!initialized) return false;
    }
    
    try {
      setConnectionState('connecting');
      
      // Create live transcription connection
      connectionRef.current = deepgramRef.current.listen.live(deepgramConfig);
      
      // Connection event handlers
      connectionRef.current.on(LiveTranscriptionEvents.Open, () => {
        console.log('Deepgram connection opened');
        setIsConnected(true);
        setConnectionState('connected');
        setError(null);
        
        // Keep alive mechanism
        keepAliveRef.current = setInterval(() => {
          if (connectionRef.current?.getReadyState() === 1) {
            connectionRef.current.keepAlive();
          }
        }, 10000);
      });
      
      connectionRef.current.on(LiveTranscriptionEvents.Close, () => {
        console.log('Deepgram connection closed');
        setIsConnected(false);
        setConnectionState('disconnected');
        
        if (keepAliveRef.current) {
          clearInterval(keepAliveRef.current);
          keepAliveRef.current = null;
        }
      });
      
      connectionRef.current.on(LiveTranscriptionEvents.Error, (error) => {
        console.error('Deepgram error:', error);
        setError('Transkripsiyon hatası: ' + error.message);
        setConnectionState('error');
      });
      
      connectionRef.current.on(LiveTranscriptionEvents.Transcript, (data) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        
        if (transcript) {
          if (data.is_final) {
            setTranscript(prev => prev + ' ' + transcript);
            setInterimTranscript('');
          } else {
            setInterimTranscript(transcript);
          }
        }
      });
      
      connectionRef.current.on(LiveTranscriptionEvents.UtteranceEnd, () => {
        // Utterance ended, finalize any interim results
        if (interimTranscript) {
          setTranscript(prev => prev + ' ' + interimTranscript);
          setInterimTranscript('');
        }
      });
      
      return true;
    } catch (error) {
      console.error('Connection error:', error);
      setError('Bağlantı hatası: ' + error.message);
      setConnectionState('error');
      return false;
    }
  }, [deepgramConfig, initializeDeepgram, interimTranscript]);
  
  // Disconnect from Deepgram
  const disconnect = useCallback(() => {
    if (connectionRef.current) {
      connectionRef.current.finish();
      connectionRef.current = null;
    }
    
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionState('disconnected');
  }, []);
  
  // Enhanced start listening with better error handling
  const startListening = useCallback(async () => {
    try {
      // Check permission first
      const hasPermission = await checkMicrophonePermission();
      if (!hasPermission) {
        return false;
      }
      
      // Connect to Deepgram if not connected
      if (!isConnected) {
        const connected = await connect();
        if (!connected) {
          setError('Deepgram bağlantısı kurulamadı. Tarayıcı ses tanıma kullanılacak.');
          return false;
        }
      }
      
      // Get microphone access with enhanced settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
          latency: 0.01 // Low latency for real-time
        }
      });
      
      streamRef.current = stream;
      
      // Check if MediaRecorder is supported
      if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        console.warn('Opus codec not supported, trying alternatives');
        const supportedTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/ogg;codecs=opus'
        ];
        
        let mimeType = 'audio/webm';
        for (const type of supportedTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type;
            break;
          }
        }
        
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      } else {
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });
      }
      
      // Enhanced data handling
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0 && connectionRef.current?.getReadyState() === 1) {
          try {
            connectionRef.current.send(event.data);
          } catch (sendError) {
            console.warn('Failed to send audio data to Deepgram:', sendError);
          }
        }
      };
      
      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setError('Ses kaydı hatası: ' + event.error.message);
      };
      
      mediaRecorderRef.current.start(100); // Send data every 100ms
      setIsListening(true);
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      
      return true;
      
    } catch (error) {
      console.error('Start listening error:', error);
      
      // Provide specific error messages
      if (error.name === 'NotAllowedError') {
        setError('Mikrofon erişimi reddedildi. Lütfen izin verin.');
      } else if (error.name === 'NotFoundError') {
        setError('Mikrofon bulunamadı.');
      } else if (error.name === 'NotReadableError') {
        setError('Mikrofon kullanımda.');
      } else {
        setError('Ses kaydı başlatılamadı: ' + error.message);
      }
      
      return false;
    }
  }, [isConnected, connect]); // Remove checkMicrophonePermission to avoid initialization order issues
  
  // Stop listening
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsListening(false);
  }, []);
  
  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);
  
  // Get final transcript (combines final + interim)
  const getFinalTranscript = useCallback(() => {
    const final = transcript.trim();
    const interim = interimTranscript.trim();
    
    if (final && interim) {
      return `${final} ${interim}`.trim();
    }
    
    return final || interim || '';
  }, [transcript, interimTranscript]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      disconnect();
    };
  }, [stopListening, disconnect]);
  
  // Enhanced microphone permission check
  const checkMicrophonePermission = useCallback(async () => {
    try {
      // First try permissions API
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'microphone' });
          if (result.state === 'granted') {
            setHasPermission(true);
            setError(null);
            return true;
          } else if (result.state === 'denied') {
            setHasPermission(false);
            setError('Mikrofon erişimi reddedildi. Lütfen tarayıcı ayarlarından mikrofon iznini etkinleştirin.');
            return false;
          }
        } catch (permError) {
          console.log('Permission query failed, trying direct access');
        }
      }
      
      // Try direct access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        // Test successful, clean up
        stream.getTracks().forEach(track => track.stop());
        setHasPermission(true);
        setError(null);
        return true;
        
      } catch (err) {
        console.error('Microphone access error:', err);
        setHasPermission(false);
        
        // Provide specific error messages
        if (err.name === 'NotAllowedError') {
          setError('Mikrofon erişimi reddedildi. Lütfen tarayıcı ayarlarından mikrofon iznini etkinleştirin.');
        } else if (err.name === 'NotFoundError') {
          setError('Mikrofon bulunamadı. Lütfen mikrofonunuzun bağlı olduğundan emin olun.');
        } else if (err.name === 'NotReadableError') {
          setError('Mikrofon başka bir uygulama tarafından kullanılıyor.');
        } else {
          setError('Mikrofon erişimi başarısız: ' + (err.message || 'Bilinmeyen hata'));
        }
        return false;
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      setHasPermission(false);
      setError('Mikrofon izni kontrol edilemedi: ' + error.message);
      return false;
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      await checkMicrophonePermission();
      await initializeDeepgram();
    };
    init();
  }, []); // Remove dependencies to avoid initialization order issues

  return {
    // State
    isConnected,
    isListening,
    transcript,
    interimTranscript,
    error,
    connectionState,
    isReady,
    hasPermission,
    
    // Actions
    connect,
    disconnect,
    startListening,
    stopListening,
    clearTranscript,
    getFinalTranscript,
    checkMicrophonePermission,
    
    // Computed
    hasTranscript: !!(transcript || interimTranscript),
    canRecord: isReady && hasPermission && !error
  };
}