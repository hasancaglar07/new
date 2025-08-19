'use client';

import { AudioProvider } from '@/components/audio/AudioProvider';
import BottomNav from '@/components/BottomNav';
import MiniPlayer from '@/components/audio/MiniPlayer';
import Navbar from '@/components/Navbar';
import MobileLayout from '@/components/MobileLayout';
import { useState } from 'react';

export default function ClientLayout({ children }) {
  const [isNativeApp, setIsNativeApp] = useState(false);

  return (
    <AudioProvider>
      <Navbar />
      <MobileLayout isNativeApp={isNativeApp} setIsNativeApp={setIsNativeApp}>
        {children}
      </MobileLayout>
      <MiniPlayer />
    </AudioProvider>
  );
}