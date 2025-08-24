'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

/**
 * Lazy Loading Image Component
 * Optimized for mobile performance
 */
export function LazyImage({ 
  src, 
  alt, 
  width, 
  height, 
  className = '',
  placeholder = 'blur',
  priority = false,
  ...props 
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setError(true);
    setIsLoaded(true);
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse rounded-lg" />
      )}
      
      {error ? (
        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center rounded-lg">
          <span className="text-slate-400 text-sm">Resim yüklenemedi</span>
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          placeholder={placeholder}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          {...props}
        />
      )}
    </div>
  );
}

/**
 * Intersection Observer Hook for Lazy Loading
 */
export function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isElementIntersecting = entry.isIntersecting;
        setIsIntersecting(isElementIntersecting);
        
        if (isElementIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [hasIntersected, options]);

  return { elementRef, isIntersecting, hasIntersected };
}

/**
 * Lazy Loading Container Component
 */
export function LazyContainer({ 
  children, 
  fallback = null, 
  className = '',
  threshold = 0.1,
  rootMargin = '50px'
}) {
  const { elementRef, hasIntersected } = useIntersectionObserver({
    threshold,
    rootMargin
  });

  return (
    <div ref={elementRef} className={className}>
      {hasIntersected ? children : fallback}
    </div>
  );
}

/**
 * Virtual Scrolling Component for Large Lists
 */
export function VirtualScrollList({ 
  items, 
  itemHeight, 
  containerHeight, 
  renderItem,
  className = '',
  overscan = 5
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index
    }));
  }, [items, itemHeight, scrollTop, containerHeight, overscan]);

  const totalHeight = items.length * itemHeight;
  const offsetY = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan) * itemHeight;

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div key={index} style={{ height: itemHeight }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Debounced Search Hook
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Memoized Component Wrapper
 */
export function MemoizedComponent({ children, dependencies = [] }) {
  return useMemo(() => children, dependencies);
}

/**
 * Performance Monitor Hook
 */
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    memoryUsage: 0,
    fps: 0
  });

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        setMetrics(prev => ({
          ...prev,
          fps,
          memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 0
        }));
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measureFPS);
    };

    measureFPS();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return metrics;
}

/**
 * Image Preloader Component
 */
export function ImagePreloader({ images = [], onComplete }) {
  const [loadedCount, setLoadedCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (images.length === 0) {
      setIsComplete(true);
      onComplete?.();
      return;
    }

    let loaded = 0;
    const imageElements = [];

    images.forEach((src) => {
      const img = new window.Image();
      img.onload = img.onerror = () => {
        loaded++;
        setLoadedCount(loaded);
        
        if (loaded === images.length) {
          setIsComplete(true);
          onComplete?.();
        }
      };
      img.src = src;
      imageElements.push(img);
    });

    return () => {
      imageElements.forEach(img => {
        img.onload = img.onerror = null;
      });
    };
  }, [images, onComplete]);

  const progress = images.length > 0 ? (loadedCount / images.length) * 100 : 100;

  return {
    progress,
    isComplete,
    loadedCount,
    totalCount: images.length
  };
}

/**
 * Optimized Grid Component with Virtualization
 */
export function OptimizedGrid({ 
  items, 
  renderItem, 
  columns = { default: 1, sm: 2, lg: 3 },
  gap = 4,
  className = ''
}) {
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef(null);
  const { elementRef, hasIntersected } = useIntersectionObserver();

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const getColumnCount = useCallback(() => {
    if (containerWidth < 640) return columns.default;
    if (containerWidth < 1024) return columns.sm || columns.default;
    return columns.lg || columns.sm || columns.default;
  }, [containerWidth, columns]);

  const columnCount = getColumnCount();
  const itemWidth = (containerWidth - (gap * (columnCount - 1))) / columnCount;

  return (
    <div ref={elementRef}>
      {hasIntersected && (
        <div 
          ref={containerRef}
          className={`grid gap-${gap} ${className}`}
          style={{
            gridTemplateColumns: `repeat(${columnCount}, 1fr)`
          }}
        >
          {items.map((item, index) => (
            <div key={index} style={{ width: itemWidth }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Code Splitting Component
 */
export function LazyComponent({ 
  loader, 
  fallback = <div className="animate-pulse bg-slate-200 h-32 rounded-lg" />,
  error = <div className="text-red-500 text-center p-4">Bileşen yüklenemedi</div>
}) {
  const [Component, setComponent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    loader()
      .then((module) => {
        setComponent(() => module.default || module);
        setIsLoading(false);
      })
      .catch(() => {
        setHasError(true);
        setIsLoading(false);
      });
  }, [loader]);

  if (hasError) return error;
  if (isLoading) return fallback;
  if (!Component) return null;

  return <Component />;
}

/**
 * Resource Preloader Hook
 */
export function useResourcePreloader(resources = []) {
  const [loadedResources, setLoadedResources] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (resources.length === 0) {
      setIsLoading(false);
      return;
    }

    const loadResource = (url, type) => {
      return new Promise((resolve, reject) => {
        if (type === 'image') {
          const img = new window.Image();
          img.onload = () => resolve(url);
          img.onerror = () => reject(url);
          img.src = url;
        } else if (type === 'script') {
          const script = document.createElement('script');
          script.onload = () => resolve(url);
          script.onerror = () => reject(url);
          script.src = url;
          document.head.appendChild(script);
        } else if (type === 'style') {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.onload = () => resolve(url);
          link.onerror = () => reject(url);
          link.href = url;
          document.head.appendChild(link);
        }
      });
    };

    const loadAllResources = async () => {
      const promises = resources.map(({ url, type }) => 
        loadResource(url, type)
          .then(() => {
            setLoadedResources(prev => new Set([...prev, url]));
            return url;
          })
          .catch(() => url) // Continue even if resource fails
      );

      await Promise.allSettled(promises);
      setIsLoading(false);
    };

    loadAllResources();
  }, [resources]);

  return {
    isLoading,
    loadedResources,
    progress: resources.length > 0 ? (loadedResources.size / resources.length) * 100 : 100
  };
}