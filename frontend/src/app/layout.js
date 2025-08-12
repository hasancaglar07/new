// frontend/src/app/layout.js

import { Inter, Amiri } from 'next/font/google'; // Google fontlarını import et
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import MobileLayout from '@/components/MobileLayout';
import { AudioProvider } from '@/components/audio/AudioProvider';
import MiniPlayer from '@/components/audio/MiniPlayer';
import './globals.css';

// Fontları yapılandır ve CSS değişkenlerine bağla
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-body' });
const amiri = Amiri({ subsets: ['latin'], weight: ['400','700'], display: 'swap', variable: '--font-heading' });

export const metadata = {
  title: 'Mihmandar E-Kütüphanesi',
  description: 'Tasavvufi eserlerde ve sohbetlerde arama yapın.',
};

// Next.js App Router: viewport ayrı export edilmelidir
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: 'no',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className={`${inter.variable} ${amiri.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      {/* Fontları base katmanında değişkenler ile kullanıyoruz */}
      <body>
        <AudioProvider>
          <MobileLayout>
            <Navbar />
            {/* Ana içerikte altta sabit nav + mini player için boşluk */}
            <main className="pb-32 md:pb-16">{children}</main>
            <MiniPlayer />
            <BottomNav />
          </MobileLayout>
        </AudioProvider>
      </body>
    </html>
  );
}