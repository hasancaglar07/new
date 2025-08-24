'use client';

import { AudioProvider } from '@/components/audio/AudioProvider';
import BottomNav from '@/components/BottomNav';
import MiniPlayer from '@/components/audio/MiniPlayer';
import Navbar from '@/components/Navbar';
import MobileLayout from '@/components/MobileLayout';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/Toast';
import { SearchProvider } from '@/contexts/SearchContext';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initAccessibility } from '@/lib/accessibility';
import { initMobileOptimizations } from '@/lib/mobileOptimization';

export default function ClientLayout({ children }) {
  const [isNativeApp, setIsNativeApp] = useState(false);
  const pathname = usePathname();
  
  // Hide BottomNav on chat page
  const shouldShowBottomNav = pathname !== '/sohbet';

  // Initialize accessibility and mobile optimizations
  useEffect(() => {
    initAccessibility();
    initMobileOptimizations();
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <SearchProvider>
          <AudioProvider>
            <Navbar />
            <MobileLayout isNativeApp={isNativeApp} setIsNativeApp={setIsNativeApp}>
              {children}
            </MobileLayout>
            <MiniPlayer />
            {shouldShowBottomNav && <BottomNav />}
          </AudioProvider>
        </SearchProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}