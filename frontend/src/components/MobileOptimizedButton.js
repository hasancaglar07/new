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
  const touchHandled = useRef(false);
  const clickTimeout = useRef(null);

  // Handle touch start for visual feedback
  const handleTouchStart = useCallback((e) => {
    if (disabled) return;
    setIsPressed(true);
    touchHandled.current = false;
  }, [disabled]);

  // Handle touch end and execute action
  const handleTouchEnd = useCallback((e) => {
    if (disabled) return;
    
    setIsPressed(false);
    
    // Only execute if not already handled
    if (!touchHandled.current && onClick) {
      touchHandled.current = true;
      onClick(e);
      
      // Clear any pending click events
      if (clickTimeout.current) {
        clearTimeout(clickTimeout.current);
        clickTimeout.current = null;
      }
    }
  }, [onClick, disabled]);

  // Handle click for non-touch devices with delay to avoid conflicts
  const handleClick = useCallback((e) => {
    if (disabled) return;
    
    // If touch was recently handled, ignore click
    if (touchHandled.current) {
      touchHandled.current = false;
      return;
    }
    
    // Delay click execution to allow touch events to be processed first
    clickTimeout.current = setTimeout(() => {
      if (onClick && !touchHandled.current) {
        onClick(e);
      }
      clickTimeout.current = null;
    }, 10);
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