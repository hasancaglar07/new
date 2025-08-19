// Responsive breakpoints and utilities

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};

// Media query helpers
export const mediaQueries = {
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
  '2xl': `@media (min-width: ${breakpoints['2xl']})`,
  
  // Max width queries
  'max-sm': `@media (max-width: ${parseInt(breakpoints.sm) - 1}px)`,
  'max-md': `@media (max-width: ${parseInt(breakpoints.md) - 1}px)`,
  'max-lg': `@media (max-width: ${parseInt(breakpoints.lg) - 1}px)`,
  
  // Touch device detection
  touch: '@media (hover: none) and (pointer: coarse)',
  hover: '@media (hover: hover) and (pointer: fine)'
};

// Hook for responsive values
export function useResponsiveValue(values) {
  if (typeof window === 'undefined') {
    return values.base || values.sm || values.md || values.lg || values.xl;
  }
  
  const width = window.innerWidth;
  
  if (width >= parseInt(breakpoints.xl) && values.xl !== undefined) {
    return values.xl;
  }
  if (width >= parseInt(breakpoints.lg) && values.lg !== undefined) {
    return values.lg;
  }
  if (width >= parseInt(breakpoints.md) && values.md !== undefined) {
    return values.md;
  }
  if (width >= parseInt(breakpoints.sm) && values.sm !== undefined) {
    return values.sm;
  }
  
  return values.base || values.sm || values.md || values.lg || values.xl;
}

// Device detection utilities
export const deviceUtils = {
  isMobile: () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < parseInt(breakpoints.md);
  },
  
  isTablet: () => {
    if (typeof window === 'undefined') return false;
    const width = window.innerWidth;
    return width >= parseInt(breakpoints.md) && width < parseInt(breakpoints.lg);
  },
  
  isDesktop: () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= parseInt(breakpoints.lg);
  },
  
  isTouchDevice: () => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
};

// Responsive container classes
export const containerClasses = {
  'container-sm': 'max-w-screen-sm mx-auto px-4',
  'container-md': 'max-w-screen-md mx-auto px-4 sm:px-6',
  'container-lg': 'max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8',
  'container-xl': 'max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8',
  'container-2xl': 'max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8',
  'container-full': 'w-full px-4 sm:px-6 lg:px-8'
};

// Grid responsive utilities
export const gridClasses = {
  'grid-responsive': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6',
  'grid-2-col': 'grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6',
  'grid-3-col': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6',
  'grid-4-col': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6'
};

// Spacing responsive utilities
export const spacingClasses = {
  'section-padding': 'py-12 sm:py-16 lg:py-20',
  'section-padding-sm': 'py-8 sm:py-12 lg:py-16',
  'section-padding-lg': 'py-16 sm:py-20 lg:py-24',
  'container-padding': 'px-4 sm:px-6 lg:px-8'
};