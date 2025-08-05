// frontend/src/app/layout.js

import { Inter } from 'next/font/google'; // Google fontunu import et
import Navbar from '@/components/Navbar';
import './globals.css';

// Fontu yapılandır
const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Yediulya E-Kütüphanesi',
  description: 'Tasavvufi eserlerde ve sohbetlerde arama yapın.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      {/* Fontu tüm body'e uygula */}
      <body className={inter.className}> 
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}