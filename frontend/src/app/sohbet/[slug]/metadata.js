const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  
  try {
    // Sohbet verilerini API'den çek
    const response = await fetch(`${API_BASE_URL}/sohbet/${slug}`, {
      next: { revalidate: 3600 } // 1 saat cache
    });
    
    if (!response.ok) {
      return {
        title: 'Sohbet Bulunamadı | Mihmandar',
        description: 'Aradığınız sohbet bulunamadı.',
      };
    }
    
    const data = await response.json();
    const chat = data.data;
    
    // Sohbet içeriğinden özet çıkar (ilk mesajdan)
    let description = 'İslami ve tasavvufi konularda yapılan sohbet.';
    if (chat.messages && chat.messages.length > 0) {
      const firstUserMessage = chat.messages.find(msg => msg.type === 'user');
      if (firstUserMessage && firstUserMessage.content) {
        description = firstUserMessage.content.length > 150 
          ? firstUserMessage.content.substring(0, 150) + '...'
          : firstUserMessage.content;
      }
    }
    
    // Başlık oluştur
    let title = chat.title || 'Sohbet';
    if (chat.messages && chat.messages.length > 0) {
      const firstUserMessage = chat.messages.find(msg => msg.type === 'user');
      if (firstUserMessage && firstUserMessage.content) {
        const shortTitle = firstUserMessage.content.length > 60 
          ? firstUserMessage.content.substring(0, 60) + '...'
          : firstUserMessage.content;
        title = shortTitle;
      }
    }
    
    // Anahtar kelimeler oluştur
    const keywords = [
      'mihmandar',
      'sohbet',
      'islami sohbet',
      'tasavvuf',
      'maneviyat',
      'din',
      'islam',
      'soru cevap',
      'dini sorular'
    ];
    
    // Sohbet içeriğinden anahtar kelimeler çıkar
    if (chat.messages) {
      chat.messages.forEach(msg => {
        if (msg.content) {
          // Yaygın İslami terimler
          const islamicTerms = [
            'namaz', 'zikir', 'dua', 'kuran', 'hadis', 'sünnet',
            'rabıta', 'nefis', 'kalp', 'ruh', 'mürşit', 'mürit',
            'tarikat', 'tekke', 'derviş', 'evliya', 'veliler',
            'fena', 'beka', 'hal', 'makam', 'keşf', 'ilham'
          ];
          
          islamicTerms.forEach(term => {
            if (msg.content.toLowerCase().includes(term) && !keywords.includes(term)) {
              keywords.push(term);
            }
          });
        }
      });
    }
    
    return {
      title: `${title} | Mihmandar Sohbet`,
      description,
      keywords: keywords.join(', '),
      openGraph: {
        title: `${title} | Mihmandar Sohbet`,
        description,
        url: `https://mihmandar.org/sohbet/${slug}`,
        siteName: 'Mihmandar',
        type: 'article',
        locale: 'tr_TR',
        images: [
          {
            url: 'https://mihmandar.org/logo-seffaf.svg',
            width: 1200,
            height: 630,
            alt: 'Mihmandar - İslami Sohbet',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} | Mihmandar Sohbet`,
        description,
        images: ['https://mihmandar.org/logo-seffaf.svg'],
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
        canonical: `https://mihmandar.org/sohbet/${slug}`,
      },
    };
  } catch (error) {
    console.error('Error generating metadata for chat:', error);
    
    return {
      title: 'Sohbet | Mihmandar',
      description: 'İslami ve tasavvufi konularda yapılan sohbet.',
      keywords: 'mihmandar, sohbet, islami sohbet, tasavvuf, maneviyat',
    };
  }
}