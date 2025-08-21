"use client";

import { useState, useRef, useCallback, useEffect } from 'react';

// Google TTS hook
export function useGoogleTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [audioQueue, setAudioQueue] = useState([]);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState('tr-TR-Chirp3-HD-Enceladus'); // High-quality Turkish voice
  
  // Refs
  const audioRef = useRef(null);
  const queueProcessingRef = useRef(false);
  
  // Turkish-optimized voice options for Google TTS
  const turkishVoices = {
    'tr-TR-Chirp3-HD-Enceladus': { name: 'Enceladus', description: 'HD Kalite - Premium Türkçe ses' },
    'tr-TR-Wavenet-E': { name: 'Emel', description: 'Kadın ses - Doğal ve akıcı' },
    'tr-TR-Wavenet-D': { name: 'Deniz', description: 'Erkek ses - Derin ve net' },
    'tr-TR-Wavenet-C': { name: 'Ceren', description: 'Kadın ses - Yumuşak ve samimi' },
    'tr-TR-Wavenet-B': { name: 'Burak', description: 'Erkek ses - Güçlü ve otoriter' },
    'tr-TR-Standard-E': { name: 'Elif', description: 'Kadın ses - Standart kalite' },
    'tr-TR-Standard-D': { name: 'Doğan', description: 'Erkek ses - Standart kalite' }
  };
  
  // Google TTS configuration - Optimized for Turkish
  const googleTTSConfig = {
    languageCode: 'tr-TR', // Turkish
    voiceName: selectedVoice, // Use selected voice
    audioEncoding: 'MP3',
    speakingRate: 0.9,
    pitch: 0.0,
    volumeGainDb: 0.0
  };
  
  // Process audio queue
  const processQueue = useCallback(async () => {
    if (queueProcessingRef.current) {
      return;
    }
    
    // Get current queue state
    setAudioQueue(currentQueue => {
      if (currentQueue.length === 0) {
        return currentQueue;
      }
      
      queueProcessingRef.current = true;
      
      const nextItem = currentQueue[0];
      const remainingQueue = currentQueue.slice(1);
      
      // Process the next item
      playAudio(nextItem.audioUrl, nextItem.onComplete)
        .then(() => {
          // Successfully played
        })
        .catch(error => {
          console.error('Queue processing error:', error);
          // Continue with next item even if current fails
        })
        .finally(() => {
          queueProcessingRef.current = false;
          
          // Process next item if queue is not empty
          if (remainingQueue.length > 0) {
            setTimeout(() => processQueue(), 100);
          }
        });
      
      return remainingQueue;
    });
  }, []);
  
  // Play audio from URL
  const playAudio = useCallback(async (audioUrl, onComplete) => {
    return new Promise((resolve, reject) => {
      try {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        setCurrentAudio(audio);
        setError(null);
        
        // Track if this audio instance was cancelled
        let isCancelled = false;
        
        audio.onloadstart = () => {
          if (!isCancelled) {
            setIsLoading(true);
          }
        };
        
        audio.oncanplay = () => {
          if (!isCancelled) {
            setIsLoading(false);
          }
        };
        
        audio.onplay = () => {
          if (!isCancelled) {
            setIsSpeaking(true);
            setIsLoading(false);
          }
        };
        
        audio.onended = () => {
          if (!isCancelled) {
            setIsSpeaking(false);
            setCurrentAudio(null);
            onComplete?.();
            resolve();
          }
        };
        
        audio.onerror = (error) => {
          if (!isCancelled) {
            setIsSpeaking(false);
            setIsLoading(false);
            setCurrentAudio(null);
            setError('Ses oynatma hatası');
            reject(error);
          }
        };
        
        audio.onpause = () => {
          if (!isCancelled) {
            setIsSpeaking(false);
          }
        };
        
        // Handle play promise properly according to Chrome guidelines
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            // Play started successfully
            if (!isCancelled) {
              setIsLoading(false);
              setIsSpeaking(true);
            }
          }).catch(error => {
            // Handle play interruption gracefully
            if (!isCancelled) {
              console.warn('Audio play interrupted:', error.name, error.message);
              setIsLoading(false);
              
              // Common interruption errors that should not be treated as failures
              if (error.name === 'AbortError' || 
                  error.name === 'NotAllowedError' ||
                  error.message.includes('interrupted')) {
                // These are expected when audio is stopped/paused quickly
                setIsSpeaking(false);
                setCurrentAudio(null);
                onComplete?.();
                resolve();
              } else {
                // Unexpected errors
                setError('Ses oynatma hatası: ' + error.message);
                setIsSpeaking(false);
                setCurrentAudio(null);
                reject(error);
              }
            }
          });
        }
        
        // Cleanup function to mark as cancelled
        const cleanup = () => {
          isCancelled = true;
        };
        
        // Store cleanup function for potential cancellation
        audio._cleanup = cleanup;
        
      } catch (error) {
        setIsSpeaking(false);
        setIsLoading(false);
        setError('Ses oynatma hatası');
        reject(error);
      }
    });
  }, []);
  
  // Generate speech using Google TTS API
  const generateSpeech = useCallback(async (text) => {
    if (!text || text.trim().length === 0) {
      console.warn('No text provided for speech generation');
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/google-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          languageCode: googleTTSConfig.languageCode,
          voiceName: googleTTSConfig.voiceName,
          audioEncoding: googleTTSConfig.audioEncoding
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        if (errorData.error && errorData.error.includes('credentials')) {
          throw new Error('Google TTS credentials yapılandırılmamış - Lütfen .env.local dosyasına gerçek credentials ekleyin');
        }
        
        throw new Error(errorData.error || 'TTS generation failed');
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      return audioUrl;
      
    } catch (error) {
      console.error('Google TTS error:', error);
      setError(error.message);
      
      // Fallback to browser TTS if Google TTS fails
      if (window.speechSynthesis) {
        console.log('Using browser speech synthesis as fallback');
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'tr-TR';
          utterance.rate = 0.9;
          utterance.pitch = 1;
          
          utterance.onstart = () => {
            setIsSpeaking(true);
            setIsLoading(false);
          };
          
          utterance.onend = () => {
            setIsSpeaking(false);
          };
          
          utterance.onerror = () => {
            setIsSpeaking(false);
            setError('Tarayıcı TTS hatası');
          };
          
          window.speechSynthesis.speak(utterance);
          return 'browser-tts-handled';
        } catch (browserError) {
          console.error('Browser TTS also failed:', browserError);
        }
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [googleTTSConfig]);
  
  // Speak text (main function)
  const speak = useCallback(async (text, options = {}) => {
    try {
      if (!text || text.trim().length === 0) {
        return;
      }
      
      // Stop current speech if speaking
      if (isSpeaking) {
        stop();
      }
      
      // Split long text into chunks for better performance
      const chunks = splitTextIntoChunks(text, options.maxChunkLength || 500);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const isLastChunk = i === chunks.length - 1;
        
        try {
          const audioUrl = await generateSpeech(chunk);
          
          // Check if browser TTS was used (no URL to queue)
          if (audioUrl === 'browser-tts-handled') {
            // Browser TTS is already playing, just call onComplete for last chunk
            if (isLastChunk) {
              // Wait a bit for browser TTS to finish, then call onComplete
              setTimeout(() => {
                options.onComplete?.();
              }, chunk.length * 50); // Rough estimate based on text length
            }
            continue;
          }
          
          // Add to queue if we have a valid audio URL
          if (audioUrl) {
            setAudioQueue(prev => [...prev, {
              audioUrl,
              onComplete: isLastChunk ? options.onComplete : null
            }]);
          }
        } catch (error) {
          console.error(`Error generating speech for chunk ${i + 1}:`, error);
          
          // If this is the last chunk or we want to continue on error
          if (isLastChunk || options.continueOnError) {
            options.onComplete?.();
          }
        }
      }
      
      // Start processing queue
       processQueue();
      
    } catch (error) {
      console.error('Speak error:', error);
      setError('Konuşma hatası: ' + error.message);
      options.onError?.(error);
    }
  }, [isSpeaking, generateSpeech, processQueue, audioQueue.length]);
  
  // Stop current speech
  const stop = useCallback(() => {
    try {
      // Stop browser speech synthesis if active (multiple attempts for reliability)
      if (window.speechSynthesis) {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
        // Additional safety check
        setTimeout(() => {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
          }
        }, 100);
      }
      
      // Function to properly cleanup audio element
      const cleanupAudio = (audio) => {
        if (audio) {
          try {
            // Mark as cancelled to prevent state updates
            if (audio._cleanup) {
              audio._cleanup();
            }
            
            // Remove all event listeners
            audio.onloadstart = null;
            audio.oncanplay = null;
            audio.onplay = null;
            audio.onended = null;
            audio.onerror = null;
            audio.onpause = null;
            audio.ontimeupdate = null;
            audio.onloadeddata = null;
            
            // Stop and reset audio
            audio.pause();
            audio.currentTime = 0;
            audio.src = '';
            audio.load(); // This helps release resources
          } catch (error) {
            console.warn('Error cleaning up audio:', error);
          }
        }
      };
      
      // Cleanup current audio instances
      cleanupAudio(audioRef.current);
      cleanupAudio(currentAudio);
      
      // Clear references
      audioRef.current = null;
      
      // Clear queue and reset states
      setAudioQueue([]);
      setIsSpeaking(false);
      setCurrentAudio(null);
      setIsLoading(false);
      setError(null);
      queueProcessingRef.current = false;
      
      // Also stop browser TTS to prevent conflicts
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          // Additional check with timeout
          setTimeout(() => {
            if (window.speechSynthesis.speaking) {
              window.speechSynthesis.cancel();
            }
          }, 100);
        } catch (error) {
          console.warn('Error stopping browser TTS:', error);
        }
      }
      
      console.log('Audio stopped and cleaned up');
    } catch (error) {
      console.warn('Error in stop function:', error);
    }
  }, [currentAudio]);
  
  // Pause current speech
  const pause = useCallback(() => {
    if (currentAudio && !currentAudio.paused) {
      currentAudio.pause();
      setIsSpeaking(false);
    }
  }, [currentAudio]);
  
  // Resume paused speech
  const resume = useCallback(() => {
    if (currentAudio && currentAudio.paused) {
      currentAudio.play().catch(error => {
        console.error('Resume error:', error);
        setError('Devam etme hatası');
      });
    }
  }, [currentAudio]);
  
  // Toggle play/pause
  const toggle = useCallback(() => {
    if (isSpeaking) {
      pause();
    } else if (currentAudio && currentAudio.paused) {
      resume();
    }
  }, [isSpeaking, currentAudio, pause, resume]);
  
  // Split text into manageable chunks
  const splitTextIntoChunks = useCallback((text, maxLength = 500) => {
    if (text.length <= maxLength) {
      return [text];
    }
    
    const chunks = [];
    const sentences = text.split(/[.!?]+/);
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;
      
      const sentenceWithPunctuation = trimmedSentence + '.';
      
      if (currentChunk.length + sentenceWithPunctuation.length <= maxLength) {
        currentChunk += (currentChunk ? ' ' : '') + sentenceWithPunctuation;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = sentenceWithPunctuation;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks.length > 0 ? chunks : [text];
  }, []);
  
  // Get available voices (for future use)
  const getVoices = useCallback(async () => {
    try {
      const response = await fetch('/api/elevenlabs/voices');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Get voices error:', error);
    }
    return [];
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);
  
  // Process queue when it changes
  useEffect(() => {
    if (audioQueue.length > 0 && !queueProcessingRef.current) {
      processQueue();
    }
  }, [audioQueue, processQueue]);
  
  return {
    // State
    isSpeaking,
    isLoading,
    error,
    queueLength: audioQueue.length,
    
    // Actions
    speak,
    stop,
    pause,
    resume,
    toggle,
    getVoices,
    
    // Computed
    canSpeak: !isLoading,
    hasAudio: !!currentAudio,
    isPaused: currentAudio && currentAudio.paused
  };
}