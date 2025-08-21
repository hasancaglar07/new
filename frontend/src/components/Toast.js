'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Toast Context
const ToastContext = createContext();

// Toast types
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Toast icons
const toastIcons = {
  [TOAST_TYPES.SUCCESS]: CheckCircle,
  [TOAST_TYPES.ERROR]: AlertCircle,
  [TOAST_TYPES.WARNING]: AlertTriangle,
  [TOAST_TYPES.INFO]: Info
};

// Toast styles
const toastStyles = {
  [TOAST_TYPES.SUCCESS]: {
    bg: 'bg-green-50 border-green-200',
    icon: 'text-green-600',
    title: 'text-green-800',
    description: 'text-green-700'
  },
  [TOAST_TYPES.ERROR]: {
    bg: 'bg-red-50 border-red-200',
    icon: 'text-red-600',
    title: 'text-red-800',
    description: 'text-red-700'
  },
  [TOAST_TYPES.WARNING]: {
    bg: 'bg-yellow-50 border-yellow-200',
    icon: 'text-yellow-600',
    title: 'text-yellow-800',
    description: 'text-yellow-700'
  },
  [TOAST_TYPES.INFO]: {
    bg: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-600',
    title: 'text-blue-800',
    description: 'text-blue-700'
  }
};

// Individual Toast Component
function Toast({ id, type, title, description, duration, onClose }) {
  const Icon = toastIcons[type];
  const styles = toastStyles[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`
        ${styles.bg} border rounded-lg shadow-lg p-4 mb-3 max-w-sm w-full
        backdrop-blur-sm relative overflow-hidden
      `}
    >
      {/* Progress bar for timed toasts */}
      {duration > 0 && (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          className="absolute bottom-0 left-0 h-1 bg-current opacity-30"
        />
      )}
      
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${styles.icon} flex-shrink-0 mt-0.5`} />
        
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={`font-medium text-sm ${styles.title} mb-1`}>
              {title}
            </h4>
          )}
          {description && (
            <p className={`text-sm ${styles.description} leading-relaxed`}>
              {description}
            </p>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onClose(id)}
          className="h-6 w-6 p-0 hover:bg-black/10 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

// Toast Container
function ToastContainer({ toasts, onClose }) {
  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-none">
      <div className="pointer-events-auto">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              {...toast}
              onClose={onClose}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Toast Provider
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      duration: 5000, // Default 5 seconds
      ...toast
    };
    
    setToasts(prev => [...prev, newToast]);
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  const value = {
    addToast,
    removeToast,
    clearAllToasts,
    toasts
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

// Toast Hook
export function useToast() {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  const { addToast, removeToast, clearAllToasts } = context;

  // Convenience methods
  const toast = {
    success: (title, description, options = {}) => {
      return addToast({
        type: TOAST_TYPES.SUCCESS,
        title,
        description,
        ...options
      });
    },
    
    error: (title, description, options = {}) => {
      return addToast({
        type: TOAST_TYPES.ERROR,
        title,
        description,
        duration: 7000, // Errors stay longer
        ...options
      });
    },
    
    warning: (title, description, options = {}) => {
      return addToast({
        type: TOAST_TYPES.WARNING,
        title,
        description,
        ...options
      });
    },
    
    info: (title, description, options = {}) => {
      return addToast({
        type: TOAST_TYPES.INFO,
        title,
        description,
        ...options
      });
    },
    
    custom: (options) => {
      return addToast(options);
    },
    
    dismiss: removeToast,
    dismissAll: clearAllToasts
  };

  return toast;
}

// Utility function for API error handling
export function handleApiError(error, toast) {
  console.error('API Error:', error);
  
  if (error.name === 'NetworkError' || !navigator.onLine) {
    toast.error(
      'Bağlantı Hatası',
      'İnternet bağlantınızı kontrol edin ve tekrar deneyin.'
    );
  } else if (error.status === 404) {
    toast.error(
      'Bulunamadı',
      'Aradığınız içerik bulunamadı.'
    );
  } else if (error.status === 500) {
    toast.error(
      'Sunucu Hatası',
      'Bir sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.'
    );
  } else {
    toast.error(
      'Bir Hata Oluştu',
      error.message || 'Beklenmeyen bir hata oluştu.'
    );
  }
}

export default ToastProvider;