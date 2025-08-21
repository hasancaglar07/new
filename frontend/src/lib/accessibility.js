// Accessibility Utilities for Mobile UX

/**
 * Focus management utilities
 */
export const focusManager = {
  // Trap focus within an element
  trapFocus: (element) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
      
      if (e.key === 'Escape') {
        element.dispatchEvent(new CustomEvent('escape'));
      }
    };
    
    element.addEventListener('keydown', handleTabKey);
    firstElement?.focus();
    
    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  },
  
  // Focus first error in form
  focusFirstError: (formElement) => {
    const firstError = formElement.querySelector('[aria-invalid="true"], .error input, .error select, .error textarea');
    if (firstError) {
      firstError.focus();
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },
  
  // Save and restore focus
  saveFocus: () => {
    const activeElement = document.activeElement;
    return () => {
      if (activeElement && typeof activeElement.focus === 'function') {
        activeElement.focus();
      }
    };
  }
};

/**
 * Screen reader utilities
 */
export const screenReader = {
  // Announce message to screen readers
  announce: (message, priority = 'polite') => {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  },
  
  // Create accessible description
  createDescription: (id, text) => {
    let description = document.getElementById(id);
    if (!description) {
      description = document.createElement('div');
      description.id = id;
      description.className = 'sr-only';
      document.body.appendChild(description);
    }
    description.textContent = text;
    return id;
  }
};

/**
 * Keyboard navigation utilities
 */
export const keyboardNav = {
  // Handle arrow key navigation in lists
  handleArrowKeys: (container, options = {}) => {
    const {
      itemSelector = '[role="option"], button, a, [tabindex="0"]',
      orientation = 'vertical',
      loop = true,
      onSelect = null
    } = options;
    
    const handleKeyDown = (e) => {
      const items = Array.from(container.querySelectorAll(itemSelector));
      const currentIndex = items.indexOf(document.activeElement);
      
      let nextIndex = currentIndex;
      
      switch (e.key) {
        case 'ArrowDown':
          if (orientation === 'vertical') {
            nextIndex = currentIndex + 1;
            if (nextIndex >= items.length && loop) nextIndex = 0;
            e.preventDefault();
          }
          break;
          
        case 'ArrowUp':
          if (orientation === 'vertical') {
            nextIndex = currentIndex - 1;
            if (nextIndex < 0 && loop) nextIndex = items.length - 1;
            e.preventDefault();
          }
          break;
          
        case 'ArrowRight':
          if (orientation === 'horizontal') {
            nextIndex = currentIndex + 1;
            if (nextIndex >= items.length && loop) nextIndex = 0;
            e.preventDefault();
          }
          break;
          
        case 'ArrowLeft':
          if (orientation === 'horizontal') {
            nextIndex = currentIndex - 1;
            if (nextIndex < 0 && loop) nextIndex = items.length - 1;
            e.preventDefault();
          }
          break;
          
        case 'Home':
          nextIndex = 0;
          e.preventDefault();
          break;
          
        case 'End':
          nextIndex = items.length - 1;
          e.preventDefault();
          break;
          
        case 'Enter':
        case ' ':
          if (onSelect && currentIndex >= 0) {
            onSelect(items[currentIndex], currentIndex);
            e.preventDefault();
          }
          break;
      }
      
      if (nextIndex !== currentIndex && nextIndex >= 0 && nextIndex < items.length) {
        items[nextIndex].focus();
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }
};

/**
 * ARIA utilities
 */
export const aria = {
  // Generate unique ID
  generateId: (prefix = 'aria') => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },
  
  // Set expanded state
  setExpanded: (trigger, target, expanded) => {
    trigger.setAttribute('aria-expanded', expanded.toString());
    if (target) {
      target.setAttribute('aria-hidden', (!expanded).toString());
    }
  },
  
  // Set selected state
  setSelected: (element, selected) => {
    element.setAttribute('aria-selected', selected.toString());
  },
  
  // Set pressed state
  setPressed: (element, pressed) => {
    element.setAttribute('aria-pressed', pressed.toString());
  },
  
  // Set loading state
  setLoading: (element, loading, label = 'Yükleniyor...') => {
    if (loading) {
      element.setAttribute('aria-busy', 'true');
      element.setAttribute('aria-label', label);
    } else {
      element.removeAttribute('aria-busy');
    }
  }
};

/**
 * Mobile accessibility enhancements
 */
export const mobileA11y = {
  // Enhance touch targets
  enhanceTouchTargets: () => {
    const style = document.createElement('style');
    style.textContent = `
      @media (hover: none) and (pointer: coarse) {
        button, a, [role="button"], input, select, textarea {
          min-height: 44px !important;
          min-width: 44px !important;
        }
        
        /* Increase spacing between interactive elements */
        button + button,
        a + a,
        [role="button"] + [role="button"] {
          margin-left: 8px !important;
        }
      }
    `;
    document.head.appendChild(style);
  },
  
  // Reduce motion for users who prefer it
  respectReducedMotion: () => {
    const style = document.createElement('style');
    style.textContent = `
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      }
    `;
    document.head.appendChild(style);
  },
  
  // High contrast mode support
  supportHighContrast: () => {
    const style = document.createElement('style');
    style.textContent = `
      @media (prefers-contrast: high) {
        button, a, [role="button"] {
          border: 2px solid currentColor !important;
        }
        
        .card, .modal, .dropdown {
          border: 2px solid currentColor !important;
        }
        
        input, select, textarea {
          border: 2px solid currentColor !important;
        }
      }
    `;
    document.head.appendChild(style);
  }
};

/**
 * Custom hooks for accessibility
 */
import { useEffect, useRef, useState } from 'react';

// Hook for managing focus trap
export function useFocusTrap(isActive) {
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (isActive && containerRef.current) {
      return focusManager.trapFocus(containerRef.current);
    }
  }, [isActive]);
  
  return containerRef;
}

// Hook for announcing changes to screen readers
export function useAnnounce() {
  return (message, priority = 'polite') => {
    screenReader.announce(message, priority);
  };
}

// Hook for keyboard navigation
export function useKeyboardNav(options = {}) {
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (containerRef.current) {
      return keyboardNav.handleArrowKeys(containerRef.current, options);
    }
  }, [options]);
  
  return containerRef;
}

// Hook for managing ARIA states
export function useAriaState(initialState = {}) {
  const [ariaState, setAriaState] = useState(initialState);
  
  const updateAria = (key, value) => {
    setAriaState(prev => ({ ...prev, [key]: value }));
  };
  
  return [ariaState, updateAria];
}

/**
 * Accessibility testing utilities
 */
export const a11yTest = {
  // Check for missing alt text
  checkAltText: () => {
    const images = document.querySelectorAll('img:not([alt])');
    if (images.length > 0) {
      console.warn('Images without alt text found:', images);
    }
  },
  
  // Check for proper heading hierarchy
  checkHeadingHierarchy: () => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let lastLevel = 0;
    
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1));
      if (level > lastLevel + 1) {
        console.warn('Heading hierarchy skip detected:', heading);
      }
      lastLevel = level;
    });
  },
  
  // Check for interactive elements without labels
  checkLabels: () => {
    const interactive = document.querySelectorAll('button, a, input, select, textarea');
    
    interactive.forEach(element => {
      const hasLabel = element.getAttribute('aria-label') ||
                      element.getAttribute('aria-labelledby') ||
                      element.textContent.trim() ||
                      (element.tagName === 'INPUT' && document.querySelector(`label[for="${element.id}"]`));
      
      if (!hasLabel) {
        console.warn('Interactive element without label:', element);
      }
    });
  }
};

/**
 * Initialize all accessibility enhancements
 */
export function initAccessibility() {
  mobileA11y.enhanceTouchTargets();
  mobileA11y.respectReducedMotion();
  mobileA11y.supportHighContrast();
  
  // Run accessibility checks in development
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      a11yTest.checkAltText();
      a11yTest.checkHeadingHierarchy();
      a11yTest.checkLabels();
    }, 1000);
  }
}