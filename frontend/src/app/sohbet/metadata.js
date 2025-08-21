// frontend/src/app/sohbet/metadata.js

export const metadata = {
  title: 'Mihmandar Asistanı - Bilge Danışman | Mihmandar',
  description: 'Mihmandar Asistanı ile tasavvuf, İslami ilimler ve manevi konularda sohbet edin. Kitaplarımızdan, makalelerimizden ve ses kayıtlarımızdan kaynaklı bilgiler alın.',
  keywords: [
    'mihmandar asistanı',
    'bilge danışman', 
    'tasavvuf sohbet',
    'islami sohbet',
    'manevi rehberlik',
    'yapay zeka asistan',
    'islami yapay zeka',
    'tasavvuf öğretisi',
    'manevi danışmanlık',
    'islami ilimler'
  ],
  openGraph: {
    title: 'Mihmandar Asistanı - Bilge Danışmanınız',
    description: 'Tasavvuf ve İslami ilimlerde uzman yapay zeka asistanı ile sohbet edin. Kaynaklı ve güvenilir bilgiler alın.',
    type: 'website',
    locale: 'tr_TR',
    siteName: 'Mihmandar',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mihmandar Asistanı - Bilge Danışman',
    description: 'Tasavvuf ve İslami ilimlerde uzman yapay zeka asistanı ile sohbet edin.',
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
  alternates: {
    canonical: 'https://mihmandar.org/sohbet',
  },
};