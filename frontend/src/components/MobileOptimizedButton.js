'use client';

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';

export default function MobileOptimizedButton({ 
  children, 
  onClick, 
  className = '', 
  disabled = false,
  ...props 
}) {
  // Optimize touch events for mobile
  const handleTouchStart = useCallback((e) => {
    // Prevent ghost clicks
    e.preventDefault();
    if (!disabled && onClick) {
      onClick(e);
    }
  }, [onClick, disabled]);

  const handleClick = useCallback((e) => {
    // Fallback for non-touch devices
    if (!disabled && onClick) {
      onClick(e);
    }
  }, [onClick, disabled]);

  return (
    <Button
      {...props}
      className={`${className} touch-manipulation select-none`}
      disabled={disabled}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      style={{
        WebkitTapHighlightColor: 'rgba(16, 185, 129, 0.3)',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation',
        ...props.style
      }}
    >
      {children}
    </Button>
  );
}