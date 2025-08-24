'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp } from 'lucide-react';

/**
 * Mobile Container Component
 * Provides consistent mobile-first container with safe areas
 */
export function MobileContainer({ children, className = '', maxWidth = '7xl', padding = 'default' }) {
  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full'
  };

  const paddings = {
    none: '',
    sm: 'px-3 sm:px-4',
    default: 'px-3 sm:px-4 md:px-6',
    lg: 'px-4 sm:px-6 md:px-8'
  };

  return (
    <div className={`
      container mx-auto 
      ${maxWidths[maxWidth]} 
      ${paddings[padding]} 
      ${className}
    `}>
      {children}
    </div>
  );
}

/**
 * Mobile Section Component
 * Provides consistent spacing for mobile sections
 */
export function MobileSection({ children, className = '', spacing = 'default' }) {
  const spacings = {
    none: '',
    sm: 'py-4 sm:py-6',
    default: 'py-6 sm:py-8 md:py-12',
    lg: 'py-8 sm:py-12 md:py-16 lg:py-20'
  };

  return (
    <section className={`${spacings[spacing]} ${className}`}>
      {children}
    </section>
  );
}

/**
 * Mobile Grid Component
 * Responsive grid with mobile-first approach
 */
export function MobileGrid({ 
  children, 
  cols = { default: 1, sm: 2, lg: 3 }, 
  gap = 'default',
  className = '' 
}) {
  const gaps = {
    none: 'gap-0',
    sm: 'gap-2 sm:gap-3',
    default: 'gap-4 sm:gap-6',
    lg: 'gap-6 sm:gap-8'
  };

  const gridCols = `
    grid-cols-${cols.default} 
    ${cols.sm ? `sm:grid-cols-${cols.sm}` : ''} 
    ${cols.md ? `md:grid-cols-${cols.md}` : ''} 
    ${cols.lg ? `lg:grid-cols-${cols.lg}` : ''} 
    ${cols.xl ? `xl:grid-cols-${cols.xl}` : ''}
  `;

  return (
    <div className={`grid ${gridCols} ${gaps[gap]} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Mobile Header Component
 * Responsive header with mobile optimizations
 */
export function MobileHeader({ 
  title, 
  subtitle, 
  children, 
  className = '',
  centered = true,
  size = 'default'
}) {
  const sizes = {
    sm: {
      title: 'text-xl sm:text-2xl md:text-3xl',
      subtitle: 'text-sm sm:text-base'
    },
    default: {
      title: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl',
      subtitle: 'text-sm sm:text-base md:text-lg'
    },
    lg: {
      title: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl',
      subtitle: 'text-base sm:text-lg md:text-xl'
    }
  };

  return (
    <header className={`
      ${centered ? 'text-center' : ''} 
      mb-6 sm:mb-8 md:mb-10 
      px-2 sm:px-0 
      ${className}
    `}>
      {title && (
        <h1 className={`
          ${sizes[size].title} 
          font-bold text-slate-800 
          leading-tight mb-2 sm:mb-3
        `}>
          {title}
        </h1>
      )}
      
      {subtitle && (
        <p className={`
          ${sizes[size].subtitle} 
          text-slate-600 
          max-w-3xl 
          ${centered ? 'mx-auto' : ''} 
          leading-relaxed
        `}>
          {subtitle}
        </p>
      )}
      
      {children}
    </header>
  );
}

/**
 * Mobile Scroll to Top Component
 */
export function MobileScrollToTop({ threshold = 300, className = '' }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollToTop}
          className={`
            fixed bottom-6 right-6 z-50
            w-12 h-12 bg-emerald-600 hover:bg-emerald-700
            text-white rounded-full shadow-lg
            flex items-center justify-center
            touch-manipulation min-h-[44px] min-w-[44px]
            transition-colors duration-200
            ${className}
          `}
          style={{
            WebkitTapHighlightColor: 'transparent',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            touchAction: 'manipulation'
          }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronUp className="w-6 h-6" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/**
 * Mobile Bottom Sheet Component
 */
export function MobileBottomSheet({ 
  isOpen, 
  onClose, 
  children, 
  className = '',
  height = 'auto'
}) {
  const heights = {
    auto: 'max-h-[80vh]',
    half: 'h-[50vh]',
    full: 'h-[90vh]'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
          
          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`
              fixed bottom-0 left-0 right-0 z-50
              bg-white rounded-t-2xl shadow-2xl
              ${heights[height]}
              ${className}
            `}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-slate-300 rounded-full" />
            </div>
            
            {/* Content */}
            <div className="px-4 pb-4 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Mobile Responsive Text Component
 */
export function MobileText({ 
  children, 
  size = 'default', 
  weight = 'normal',
  color = 'default',
  className = '' 
}) {
  const sizes = {
    xs: 'text-xs sm:text-sm',
    sm: 'text-sm sm:text-base',
    default: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl',
    xl: 'text-xl sm:text-2xl',
    '2xl': 'text-2xl sm:text-3xl',
    '3xl': 'text-3xl sm:text-4xl'
  };

  const weights = {
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold'
  };

  const colors = {
    default: 'text-slate-900',
    muted: 'text-slate-600',
    light: 'text-slate-500',
    primary: 'text-emerald-600',
    white: 'text-white'
  };

  return (
    <span className={`
      ${sizes[size]} 
      ${weights[weight]} 
      ${colors[color]} 
      ${className}
    `}>
      {children}
    </span>
  );
}

/**
 * Mobile Input Component
 */
export function MobileInput({ 
  className = '', 
  size = 'default',
  ...props 
}) {
  const sizes = {
    sm: 'h-9 sm:h-10 text-sm px-3',
    default: 'h-10 sm:h-11 text-sm sm:text-base px-3 sm:px-4',
    lg: 'h-12 sm:h-14 text-base sm:text-lg px-4 sm:px-6'
  };

  return (
    <input
      className={`
        ${sizes[size]}
        w-full rounded-lg border border-slate-300
        focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20
        transition-all duration-200
        touch-manipulation
        ${className}
      `}
      style={{
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'text',
        fontSize: '16px' // Prevents zoom on iOS
      }}
      {...props}
    />
  );
}

/**
 * Mobile Loading Spinner Component
 */
export function MobileSpinner({ size = 'default', color = 'primary', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colors = {
    primary: 'border-emerald-600',
    white: 'border-white',
    slate: 'border-slate-600'
  };

  return (
    <div className={`
      ${sizes[size]} 
      ${colors[color]} 
      border-2 border-t-transparent 
      rounded-full animate-spin 
      ${className}
    `} />
  );
}

/**
 * Mobile Badge Component
 */
export function MobileBadge({ 
  children, 
  variant = 'default', 
  size = 'default',
  className = '' 
}) {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-emerald-100 text-emerald-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700'
  };

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    default: 'px-2 py-1 text-xs sm:text-sm',
    lg: 'px-3 py-1.5 text-sm sm:text-base'
  };

  return (
    <span className={`
      ${variants[variant]} 
      ${sizes[size]} 
      font-medium rounded-full 
      ${className}
    `}>
      {children}
    </span>
  );
}