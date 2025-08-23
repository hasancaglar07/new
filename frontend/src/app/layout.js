// frontend/src/app/layout.js

import { Inter } from 'next/font/google';
import './globals.css';
import ClientLayout from '@/components/ClientLayout';
import StructuredData, { websiteStructuredData, organizationStructuredData } from '@/components/StructuredData';
import PWAInstaller from '@/components/PWAInstaller';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true
});

export const metadata = {
  title: {
    default: 'Mihmandar.org - E-Kütüphane | İlim ve Maneviyat Merkezi',
    template: '%s | Mihmandar.org E-Kütüphanesi'
  },
  description: 'Mihmandar.org E-Kütüphanesi - İslami kitaplar, ses kayıtları, makaleler ve daha fazlası. İlim ve maneviyat dünyasına açılan kapınız.',
  keywords: ['mihmandar', 'e-kütüphane', 'islami kitaplar', 'tasavvuf', 'maneviyat', 'ilim', 'kitap', 'ses kayıtları', 'makaleler'],
  authors: [{ name: 'Mihmandar.org' }],
  creator: 'Mihmandar.org',
  publisher: 'Mihmandar.org',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://mihmandar.org'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Mihmandar.org - E-Kütüphane | İlim ve Maneviyat Merkezi',
    description: 'İslami kitaplar, ses kayıtları, makaleler ve daha fazlası. İlim ve maneviyat dünyasına açılan kapınız.',
    url: 'https://mihmandar.org',
    siteName: 'Mihmandar.org E-Kütüphanesi',
    images: [
      {
        url: '/mihmandar-logo.svg',
        width: 1200,
        height: 630,
        alt: 'Mihmandar.org E-Kütüphanesi Logo',
      },
    ],
    locale: 'tr_TR',
    type: 'website',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mihmandar.org',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Mihmandar.org',
    'application-name': 'Mihmandar.org',
    'msapplication-TileColor': '#10b981',
    'theme-color': '#10b981',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mihmandar.org - E-Kütüphane',
    description: 'İslami kitaplar, ses kayıtları, makaleler ve daha fazlası.',
    images: ['/mihmandar-logo.svg'],
    creator: '@mihmandarorg',
    site: '@mihmandarorg',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        {/* Critical viewport meta tag for mobile touch optimization */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10b981" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Mihmandar.org" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#10b981" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* Mobile touch optimization */}
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
        <meta name="HandheldFriendly" content="true" />
        <meta name="MobileOptimized" content="width" />
      </head>
      <body className={inter.className}>
        <a href="#main-content" className="skip-link">
          Ana içeriğe geç
        </a>
        <StructuredData data={websiteStructuredData} />
        <StructuredData data={organizationStructuredData} />
        <ClientLayout>{children}</ClientLayout>
        <PWAInstaller />
      </body>
    </html>
  );
}