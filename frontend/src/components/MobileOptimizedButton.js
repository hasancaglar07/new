'use client';

import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function MobileOptimizedButton({ 
  children, 
  onClick, 
  className = '', 
  disabled = false,
  ...props 
}) {
  const [isPressed, setIsPressed] = useState(false);
  const touchStartTime = useRef(0);
  const hasTouchStarted = useRef(false);

  // Optimize touch events for mobile - immediate response
  const handleTouchStart = useCallback((e) => {
    if (disabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    hasTouchStarted.current = true;
    touchStartTime.current = Date.now();
    setIsPressed(true);
    
    // Immediate visual feedback
    if (onClick) {
      onClick(e);
    }
  }, [onClick, disabled]);

  const handleTouchEnd = useCallback((e) => {
    if (disabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsPressed(false);
    hasTouchStarted.current = false;
  }, [disabled]);

  const handleClick = useCallback((e) => {
    // Prevent duplicate events from touch devices
    if (hasTouchStarted.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Fallback for non-touch devices
    if (!disabled && onClick) {
      onClick(e);
    }
  }, [onClick, disabled]);

  return (
    <Button
      {...props}
      className={`${className} touch-manipulation select-none transition-transform duration-75 ${isPressed ? 'scale-95' : 'scale-100'}`}
      disabled={disabled}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      style={{
        WebkitTapHighlightColor: 'rgba(16, 185, 129, 0.2)',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation',
        minHeight: '44px',
        minWidth: '44px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...props.style
      }}
    >
      {children}
    </Button>
  );
}