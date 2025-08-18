// frontend/src/app/layout.js

'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { AudioProvider } from '@/components/audio/AudioProvider';
import BottomNav from '@/components/BottomNav';
import MiniPlayer from '@/components/audio/MiniPlayer';
import Navbar from '@/components/Navbar';
import MobileLayout from '@/components/MobileLayout';
import { useState } from 'react';

const inter = Inter({ subsets: ['latin'] });



export default function RootLayout({ children }) {
  const [isNativeApp, setIsNativeApp] = useState(false);

  return (
    <html lang="en">
      <body className={inter.className}>
        <AudioProvider>
          <Navbar />
          <MobileLayout isNativeApp={isNativeApp} setIsNativeApp={setIsNativeApp}>{children}</MobileLayout>
          
          <MiniPlayer />
        </AudioProvider>
      </body>
    </html>
  );
}