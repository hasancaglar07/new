// frontend/src/app/layout.js

import { Inter } from 'next/font/google'; // Google fontunu import et
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import MobileLayout from '@/components/MobileLayout';
import './globals.css';

// Fontu yapılandır
const inter = Inter({ subsets: ['latin'] });

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
    <html lang="tr">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      {/* Fontu tüm body'e uygula */}
      <body className={inter.className}> 
        <MobileLayout>
          <Navbar />
          {/* Ana içerikte altta sabit nav için boşluk */}
          <main className="pb-24 md:pb-0">{children}</main>
          <BottomNav />
        </MobileLayout>
      </body>
    </html>
  );
}