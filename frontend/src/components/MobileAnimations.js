'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Mobile-optimized animation variants
 */
export const mobileAnimations = {
  // Fade animations
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3, ease: "easeOut" }
    }
  },

  // Slide animations
  slideUp: {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  },

  slideDown: {
    hidden: { opacity: 0, y: -30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  },

  slideLeft: {
    hidden: { opacity: 0, x: 30 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  },

  slideRight: {
    hidden: { opacity: 0, x: -30 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  },

  // Scale animations
  scaleIn: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.3, ease: "easeOut" }
    }
  },

  // Stagger animations for lists
  staggerContainer: {
    visible: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  },

  staggerItem: {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  },

  // Touch feedback animations
  touchFeedback: {
    whileTap: { 
      scale: 0.95,
      transition: { duration: 0.1 }
    }
  },

  // Hover animations (for devices that support hover)
  hoverLift: {
    whileHover: { 
      y: -4,
      transition: { duration: 0.2, ease: "easeOut" }
    }
  }
};

/**
 * Mobile Fade In Animation Component
 */
export function MobileFadeIn({ children, delay = 0, duration = 0.3, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Mobile Slide Up Animation Component
 */
export function MobileSlideUp({ children, delay = 0, duration = 0.4, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Mobile Scale In Animation Component
 */
export function MobileScaleIn({ children, delay = 0, duration = 0.3, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Mobile Stagger Container Component
 */
export function MobileStaggerContainer({ children, className = '', staggerDelay = 0.1 }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Mobile Stagger Item Component
 */
export function MobileStaggerItem({ children, className = '' }) {
  return (
    <motion.div
      variants={mobileAnimations.staggerItem}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Mobile Touch Button Component with feedback
 */
export function MobileTouchButton({ children, onClick, className = '', ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.1 }}
      onClick={onClick}
      className={`
        ${className}
        touch-manipulation min-h-[44px] min-w-[44px]
        transition-all duration-200 active:scale-95
      `}
      style={{
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation'
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

/**
 * Mobile Loading Skeleton Component
 */
export function MobileSkeleton({ className = '', variant = 'default' }) {
  const variants = {
    default: 'bg-slate-200',
    card: 'bg-white border border-slate-200 p-4 space-y-3',
    text: 'bg-slate-200 h-4',
    title: 'bg-slate-300 h-6',
    avatar: 'bg-slate-200 rounded-full w-10 h-10'
  };

  return (
    <div className={`${variants[variant]} ${className} animate-pulse rounded-lg`}>
      {variant === 'card' && (
        <>
          <div className="bg-slate-200 h-6 rounded w-3/4"></div>
          <div className="bg-slate-200 h-4 rounded w-full"></div>
          <div className="bg-slate-200 h-4 rounded w-2/3"></div>
        </>
      )}
    </div>
  );
}

/**
 * Mobile Page Transition Component
 */
export function MobilePageTransition({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Mobile Pull to Refresh Component
 */
export function MobilePullToRefresh({ onRefresh, children, className = '' }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
    setPullDistance(0);
  };

  return (
    <motion.div
      className={`relative ${className}`}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDrag={(event, info) => {
        if (info.offset.y > 0) {
          setPullDistance(Math.min(info.offset.y, 100));
        }
      }}
      onDragEnd={(event, info) => {
        if (info.offset.y > 60) {
          handleRefresh();
        } else {
          setPullDistance(0);
        }
      }}
    >
      {pullDistance > 0 && (
        <motion.div
          className="absolute top-0 left-0 right-0 flex justify-center items-center"
          style={{ height: pullDistance }}
          initial={{ opacity: 0 }}
          animate={{ opacity: pullDistance > 30 ? 1 : 0.5 }}
        >
          <div className="text-emerald-600 text-sm font-medium">
            {pullDistance > 60 ? 'Yenilemek için bırakın' : 'Yenilemek için çekin'}
          </div>
        </motion.div>
      )}
      
      {isRefreshing && (
        <motion.div
          className="absolute top-0 left-0 right-0 flex justify-center items-center py-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        </motion.div>
      )}
      
      <motion.div
        style={{ y: pullDistance }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/**
 * Mobile Swipe Gesture Component
 */
export function MobileSwipeGesture({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeUp, 
  onSwipeDown,
  threshold = 50,
  className = '' 
}) {
  return (
    <motion.div
      className={className}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={(event, info) => {
        const { offset } = info;
        
        if (Math.abs(offset.x) > Math.abs(offset.y)) {
          // Horizontal swipe
          if (offset.x > threshold && onSwipeRight) {
            onSwipeRight();
          } else if (offset.x < -threshold && onSwipeLeft) {
            onSwipeLeft();
          }
        } else {
          // Vertical swipe
          if (offset.y > threshold && onSwipeDown) {
            onSwipeDown();
          } else if (offset.y < -threshold && onSwipeUp) {
            onSwipeUp();
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
}