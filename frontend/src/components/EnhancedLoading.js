'use client';

import { motion } from 'framer-motion';
import { Loader2, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/Toast';
import { useState, useEffect } from 'react';

// Enhanced loading states for better mobile UX
export const LOADING_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  OFFLINE: 'offline'
};

// Skeleton loader for different content types
export function SkeletonLoader({ type = 'default', count = 1, className = '' }) {
  const skeletons = {
    default: (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    ),
    
    card: (
      <div className="animate-pulse">
        <div className="bg-gray-200 rounded-lg h-48 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    ),
    
    list: (
      <div className="animate-pulse space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    ),
    
    text: (
      <div className="animate-pulse space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`h-4 bg-gray-200 rounded ${
            i === 3 ? 'w-2/3' : 'w-full'
          }`}></div>
        ))}
      </div>
    ),
    
    button: (
      <div className="animate-pulse h-10 bg-gray-200 rounded-lg w-32"></div>
    )
  };
  
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={i > 0 ? 'mt-6' : ''}>
          {skeletons[type]}
        </div>
      ))}
    </div>
  );
}

// Enhanced loading spinner with context
export function EnhancedSpinner({ 
  size = 'md', 
  text = null, 
  subtext = null,
  showProgress = false,
  progress = 0,
  className = '' 
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };
  
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 className={`${sizeClasses[size]} text-emerald-600`} />
      </motion.div>
      
      {text && (
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-gray-700">{text}</p>
          {subtext && (
            <p className="text-xs text-gray-500">{subtext}</p>
          )}
        </div>
      )}
      
      {showProgress && (
        <div className="w-full max-w-xs">
          <div className="bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-emerald-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">
            {Math.round(progress)}%
          </p>
        </div>
      )}
    </div>
  );
}

// Loading state manager component
export function LoadingStateManager({ 
  state, 
  onRetry, 
  loadingText = 'Yükleniyor...', 
  errorText = 'Bir hata oluştu',
  offlineText = 'İnternet bağlantısı yok',
  children 
}) {
  const toast = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  useEffect(() => {
    if (!isOnline) {
      toast.warning('Bağlantı Kesildi', 'İnternet bağlantınızı kontrol edin.');
    }
  }, [isOnline, toast]);
  
  if (state === LOADING_STATES.LOADING) {
    return (
      <div className="flex items-center justify-center min-h-[200px] p-8">
        <EnhancedSpinner 
          size="lg" 
          text={loadingText}
          subtext="Lütfen bekleyin..."
        />
      </div>
    );
  }
  
  if (state === LOADING_STATES.ERROR || (!isOnline && state !== LOADING_STATES.SUCCESS)) {
    return (
      <div className="flex items-center justify-center min-h-[200px] p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              {!isOnline ? (
                <WifiOff className="w-8 h-8 text-red-600" />
              ) : (
                <RefreshCw className="w-8 h-8 text-red-600" />
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">
                {!isOnline ? offlineText : errorText}
              </h3>
              <p className="text-sm text-gray-600">
                {!isOnline 
                  ? 'Bağlantı geri geldiğinde otomatik olarak yeniden denenecek.'
                  : 'Sayfayı yenilemeyi deneyin veya daha sonra tekrar deneyin.'
                }
              </p>
            </div>
            
            {onRetry && (
              <Button 
                onClick={onRetry}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!isOnline}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tekrar Dene
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return children;
}

// Progressive loading component
export function ProgressiveLoader({ 
  steps, 
  currentStep = 0, 
  className = '' 
}) {
  const progress = (currentStep / (steps.length - 1)) * 100;
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-gray-700">
            {steps[currentStep]?.label || 'Yükleniyor...'}
          </span>
          <span className="text-gray-500">
            {currentStep + 1} / {steps.length}
          </span>
        </div>
        
        <div className="bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-emerald-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
      
      <div className="flex items-center justify-center py-8">
        <EnhancedSpinner 
          size="lg" 
          text={steps[currentStep]?.description}
        />
      </div>
    </div>
  );
}

// Lazy loading wrapper with intersection observer
export function LazyLoader({ 
  children, 
  fallback = <SkeletonLoader />, 
  threshold = 0.1,
  rootMargin = '50px',
  className = '' 
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [ref, setRef] = useState(null);
  
  useEffect(() => {
    if (!ref) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    
    observer.observe(ref);
    
    return () => observer.disconnect();
  }, [ref, threshold, rootMargin]);
  
  return (
    <div ref={setRef} className={className}>
      {isVisible ? children : fallback}
    </div>
  );
}

export default {
  SkeletonLoader,
  EnhancedSpinner,
  LoadingStateManager,
  ProgressiveLoader,
  LazyLoader,
  LOADING_STATES
};