'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoadingSpinner({ 
  size = 'md', 
  className = '', 
  text = null,
  variant = 'default'
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const variantClasses = {
    default: 'text-slate-500',
    primary: 'text-emerald-600',
    white: 'text-white',
    muted: 'text-slate-400'
  };

  return (
    <div className={cn('flex items-center justify-center gap-3', className)}>
      <Loader2 
        className={cn(
          'animate-spin',
          sizeClasses[size],
          variantClasses[variant]
        )} 
      />
      {text && (
        <span className={cn(
          'text-sm font-medium',
          variantClasses[variant]
        )}>
          {text}
        </span>
      )}
    </div>
  );
}

// Specialized loading components
export function PageLoader({ text = 'Yükleniyor...' }) {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <LoadingSpinner size="lg" text={text} variant="primary" />
    </div>
  );
}

export function ButtonLoader({ size = 'sm' }) {
  return <LoadingSpinner size={size} variant="white" />;
}

export function InlineLoader({ text = null }) {
  return <LoadingSpinner size="sm" text={text} variant="muted" />;
}