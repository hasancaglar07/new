// Mobile Touch Optimization Utilities

/**
 * Debounce function to prevent multiple rapid clicks
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function for touch events
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Enhanced click handler for mobile optimization
 */
export const createMobileClickHandler = (callback, options = {}) => {
  const {
    debounceTime = 300,
    preventDoubleClick = true,
    immediateVisualFeedback = true
  } = options;

  let lastClickTime = 0;
  let isProcessing = false;

  return (event) => {
    const now = Date.now();
    
    // Prevent double clicks
    if (preventDoubleClick && now - lastClickTime < debounceTime) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    
    // Prevent multiple processing
    if (isProcessing) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    
    lastClickTime = now;
    isProcessing = true;
    
    // Immediate visual feedback
    if (immediateVisualFeedback && event.target) {
      const target = event.target.closest('button, [role="button"], .btn, .clickable');
      if (target) {
        target.style.transform = 'scale(0.98)';
        target.style.transition = 'transform 0.05s ease';
        
        setTimeout(() => {
          target.style.transform = 'scale(1)';
        }, 100);
      }
    }
    
    // Execute callback
    try {
      callback(event);
    } finally {
      // Reset processing flag after a short delay
      setTimeout(() => {
        isProcessing = false;
      }, debounceTime);
    }
  };
};

/**
 * Touch event optimization for better mobile experience
 */
export const optimizeTouchEvents = () => {
  // Remove 300ms delay
  document.addEventListener('touchstart', function() {}, { passive: true });
  
  // Prevent zoom on double tap for specific elements
  const preventZoomElements = document.querySelectorAll('button, [role="button"], .btn, input, textarea');
  
  preventZoomElements.forEach(element => {
    let lastTouchEnd = 0;
    
    element.addEventListener('touchend', function(event) {
      const now = new Date().getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });
  });
};

/**
 * Initialize mobile optimizations
 */
export const initMobileOptimizations = () => {
  // Check if we're on a mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (!isMobile) return;
  
  // Apply optimizations
  optimizeTouchEvents();
  
  // Add mobile-specific CSS class
  document.documentElement.classList.add('mobile-optimized');
  
  // Prevent zoom on input focus (iOS)
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      document.querySelector('meta[name="viewport"]')?.setAttribute(
        'content', 
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
      );
    });
    
    input.addEventListener('blur', () => {
      document.querySelector('meta[name="viewport"]')?.setAttribute(
        'content', 
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
      );
    });
  });
  
  console.log('Mobile optimizations initialized');
};

/**
 * Custom hook for mobile-optimized button clicks
 */
export const useMobileClick = (callback, options = {}) => {
  return createMobileClickHandler(callback, options);
};

/**
 * Detect if device supports touch
 */
export const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Get optimal touch target size
 */
export const getOptimalTouchSize = () => {
  return {
    minWidth: '44px',
    minHeight: '44px',
    padding: '12px 16px'
  };
};

/**
 * Apply mobile-specific styles
 */
export const applyMobileStyles = (element) => {
  if (!element) return;
  
  const styles = {
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'rgba(16, 185, 129, 0.2)',
    WebkitTouchCallout: 'none',
    WebkitUserSelect: 'none',
    userSelect: 'none',
    cursor: 'pointer',
    transition: 'transform 0.05s ease',
    ...getOptimalTouchSize()
  };
  
  Object.assign(element.style, styles);
};