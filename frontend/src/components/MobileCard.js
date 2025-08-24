'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Enhanced Mobile Card Component
 * Optimized for touch interactions and mobile UX
 */
export default function MobileCard({ 
  children, 
  className = '', 
  variant = 'default',
  hoverable = true,
  clickable = false,
  onClick,
  ...props 
}) {
  const variants = {
    default: 'bg-white border border-gray-200 shadow-sm',
    elevated: 'bg-white border border-gray-200 shadow-lg',
    gradient: 'bg-gradient-to-br from-white via-slate-50/30 to-emerald-50/20 border border-emerald-200/50 shadow-lg',
    outlined: 'bg-transparent border-2 border-emerald-200 shadow-none'
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  const hoverVariants = hoverable ? {
    whileHover: { 
      y: -4,
      scale: 1.02,
      transition: { duration: 0.2, ease: "easeOut" }
    },
    whileTap: clickable ? { 
      scale: 0.98,
      transition: { duration: 0.1 }
    } : {}
  } : {};

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      {...hoverVariants}
      onClick={clickable ? onClick : undefined}
      className={clickable ? 'cursor-pointer' : ''}
    >
      <Card 
        className={`
          ${variants[variant]} 
          ${className} 
          rounded-xl overflow-hidden transition-all duration-300 
          touch-manipulation
          ${clickable ? 'hover:shadow-xl active:scale-95' : ''}
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
      </Card>
    </motion.div>
  );
}

/**
 * Mobile Card Header Component
 */
export function MobileCardHeader({ children, className = '', ...props }) {
  return (
    <CardHeader 
      className={`p-4 sm:p-6 ${className}`}
      {...props}
    >
      {children}
    </CardHeader>
  );
}

/**
 * Mobile Card Content Component
 */
export function MobileCardContent({ children, className = '', ...props }) {
  return (
    <CardContent 
      className={`p-4 sm:p-6 ${className}`}
      {...props}
    >
      {children}
    </CardContent>
  );
}

/**
 * Mobile Card Footer Component
 */
export function MobileCardFooter({ children, className = '', ...props }) {
  return (
    <CardFooter 
      className={`p-4 sm:p-6 pt-0 ${className}`}
      {...props}
    >
      {children}
    </CardFooter>
  );
}

/**
 * Mobile Card Title Component
 */
export function MobileCardTitle({ children, className = '', size = 'default', ...props }) {
  const sizes = {
    small: 'text-base sm:text-lg',
    default: 'text-lg sm:text-xl',
    large: 'text-xl sm:text-2xl'
  };

  return (
    <CardTitle 
      className={`${sizes[size]} font-bold text-slate-800 leading-tight ${className}`}
      {...props}
    >
      {children}
    </CardTitle>
  );
}

/**
 * Mobile Action Button Component
 */
export function MobileActionButton({ 
  children, 
  variant = 'primary', 
  size = 'default',
  fullWidth = false,
  className = '',
  ...props 
}) {
  const variants = {
    primary: 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
    outline: 'border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50'
  };

  const sizes = {
    small: 'h-9 sm:h-10 text-sm px-3 sm:px-4',
    default: 'h-10 sm:h-11 text-sm sm:text-base px-4 sm:px-6',
    large: 'h-12 sm:h-14 text-base sm:text-lg px-6 sm:px-8'
  };

  return (
    <Button
      className={`
        ${variants[variant]} 
        ${sizes[size]} 
        ${fullWidth ? 'w-full' : ''} 
        ${className}
        font-semibold rounded-lg transition-all duration-200 
        transform hover:scale-105 shadow-md hover:shadow-lg 
        touch-manipulation min-h-[44px] active:scale-95
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
    </Button>
  );
}