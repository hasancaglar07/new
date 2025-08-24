// Design System Tokens for consistent styling across all pages

export const colors = {
  // Primary brand colors
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d'
  },
  
  // Emerald theme (main brand)
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b'
  },
  
  // Teal accent
  teal: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a'
  },
  
  // Neutral grays
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a'
  },
  
  // Semantic colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6'
};

export const typography = {
  // Font families
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Consolas', 'monospace']
  },
  
  // Font sizes
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
    '6xl': '3.75rem'   // 60px
  },
  
  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800'
  },
  
  // Line heights
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75'
  }
};

export const spacing = {
  // Consistent spacing scale
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  32: '8rem',     // 128px
  40: '10rem',    // 160px
  48: '12rem',    // 192px
  56: '14rem',    // 224px
  64: '16rem'     // 256px
};

export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px'
};

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  
  // Brand specific shadows
  emerald: '0 20px 25px -5px rgb(16 185 129 / 0.1), 0 8px 10px -6px rgb(16 185 129 / 0.1)',
  teal: '0 20px 25px -5px rgb(20 184 166 / 0.1), 0 8px 10px -6px rgb(20 184 166 / 0.1)'
};

export const animations = {
  // Transition durations
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms'
  },
  
  // Easing functions
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
};

// Component-specific design tokens
export const components = {
  // Page layouts
  page: {
    maxWidth: '1200px',
    padding: {
      mobile: spacing[4],
      tablet: spacing[6],
      desktop: spacing[8]
    },
    background: {
      primary: 'bg-slate-50',
      gradient: 'bg-gradient-to-br from-slate-50 via-white to-slate-100'
    }
  },
  
  // Headers
  header: {
    spacing: {
      mobile: spacing[10],
      desktop: spacing[12]
    },
    title: {
      size: {
        mobile: typography.fontSize['3xl'],
        desktop: typography.fontSize['5xl']
      },
      weight: typography.fontWeight.bold,
      color: colors.emerald[600]
    },
    subtitle: {
      size: {
        mobile: typography.fontSize.base,
        desktop: typography.fontSize.lg
      },
      color: colors.slate[600]
    }
  },
  
  // Cards
  card: {
    background: 'bg-white',
    border: `border border-${colors.slate[200]}`,
    borderRadius: borderRadius.xl,
    shadow: shadows.lg,
    padding: spacing[6],
    hover: {
      shadow: shadows.xl,
      transform: 'hover:-translate-y-1',
      transition: 'transition-all duration-300'
    }
  },
  
  // Buttons
  button: {
    primary: {
      background: `bg-${colors.emerald[600]}`,
      hover: `hover:bg-${colors.emerald[700]}`,
      text: 'text-white',
      padding: `px-${spacing[6]} py-${spacing[3]}`,
      borderRadius: borderRadius.lg,
      fontWeight: typography.fontWeight.semibold
    },
    secondary: {
      background: `bg-${colors.slate[100]}`,
      hover: `hover:bg-${colors.slate[200]}`,
      text: `text-${colors.slate[700]}`,
      padding: `px-${spacing[6]} py-${spacing[3]}`,
      borderRadius: borderRadius.lg,
      fontWeight: typography.fontWeight.medium
    }
  },
  
  // Form inputs
  input: {
    base: {
      background: 'bg-white',
      border: `border border-${colors.slate[300]}`,
      borderRadius: borderRadius.lg,
      padding: `px-${spacing[4]} py-${spacing[3]}`,
      fontSize: typography.fontSize.base,
      focus: {
        border: `focus:border-${colors.emerald[500]}`,
        ring: 'focus:ring-4 focus:ring-emerald-500/20',
        outline: 'focus:outline-none'
      }
    },
    large: {
      padding: `px-${spacing[6]} py-${spacing[4]}`,
      fontSize: typography.fontSize.lg,
      borderRadius: borderRadius.xl
    }
  }
};

// Utility functions for consistent styling
export const getPageClasses = () => {
  return `min-h-screen ${components.page.background.primary}`;
};

export const getContainerClasses = () => {
  return `container mx-auto px-4 py-12 md:py-20 max-w-6xl`;
};

export const getHeaderClasses = () => {
  return `text-center mb-10`;
};

export const getTitleClasses = () => {
  return `text-4xl md:text-5xl font-bold text-emerald-600 mb-4`;
};

export const getSubtitleClasses = () => {
  return `text-base md:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed`;
};

export const getCardClasses = () => {
  return `bg-white border border-slate-200 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300`;
};

export const getButtonClasses = (variant = 'primary') => {
  const base = 'inline-flex items-center justify-center font-semibold transition-all duration-300 focus:outline-none focus:ring-4';
  
  switch (variant) {
    case 'primary':
      return `${base} bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg focus:ring-emerald-500/20`;
    case 'secondary':
      return `${base} bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-lg focus:ring-slate-500/20`;
    default:
      return `${base} bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg focus:ring-emerald-500/20`;
  }
};

export const getInputClasses = (size = 'base') => {
  const base = 'w-full bg-white border border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 focus:outline-none transition-all duration-300';
  
  switch (size) {
    case 'large':
      return `${base} px-6 py-4 text-lg rounded-xl`;
    case 'small':
      return `${base} px-3 py-2 text-sm rounded-md`;
    default:
      return `${base} px-4 py-3 text-base rounded-lg`;
  }
};

// Animation variants for Framer Motion
export const motionVariants = {
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  },
  
  fadeInDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 }
  },
  
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
  },
  
  slideInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  },
  
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  },
  
  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  }
};

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animations,
  components,
  motionVariants,
  // Utility functions
  getPageClasses,
  getContainerClasses,
  getHeaderClasses,
  getTitleClasses,
  getSubtitleClasses,
  getCardClasses,
  getButtonClasses,
  getInputClasses
};