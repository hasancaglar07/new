"use client";

import { useEffect } from 'react';

// JSON-LD Structured Data bileşeni
export function ChatStructuredData({ chatData, slug }) {
  useEffect(() => {
    if (!chatData) return;

    // Mevcut structured data script'lerini temizle
    const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
    existingScripts.forEach(script => {
      if (script.textContent.includes('QAPage') || script.textContent.includes('FAQPage')) {
        script.remove();
      }
    });

    // Sohbet verilerinden Q&A çiftleri oluştur
    const qaItems = [];
    let currentQuestion = null;
    
    if (chatData.messages) {
      chatData.messages.forEach(message => {
        if (message.type === 'user' && message.content) {
          currentQuestion = message.content;
        } else if (message.type === 'assistant' && message.content && currentQuestion) {
          qaItems.push({
            '@type': 'Question',
            'name': currentQuestion,
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': message.content.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\[\d+\]/g, '').trim()
            }
          });
          currentQuestion = null;
        }
      });
    }

    // JSON-LD structured data oluştur
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'QAPage',
      'mainEntity': qaItems.length > 0 ? qaItems : [{
        '@type': 'Question',
        'name': 'İslami ve tasavvufi sorular',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'Mihmandar asistanı ile İslami ve tasavvufi konularda sohbet edebilirsiniz.'
        }
      }],
      'about': {
        '@type': 'Thing',
        'name': 'İslami Sohbet ve Tasavvuf',
        'description': 'İslami ilimler ve tasavvuf konularında soru-cevap sohbeti'
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'Mihmandar',
        'url': 'https://mihmandar.org',
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://mihmandar.org/logo-seffaf.svg'
        }
      },
      'url': `https://mihmandar.org/sohbet/${slug}`,
      'datePublished': chatData.created_at || new Date().toISOString(),
      'dateModified': chatData.updated_at || chatData.created_at || new Date().toISOString(),
      'inLanguage': 'tr-TR'
    };

    // Script elementini oluştur ve sayfaya ekle
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData, null, 2);
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [chatData, slug]);

  return null; // Bu bileşen görsel bir şey render etmez
}

// Ana sohbet sayfası için structured data
export function MainChatStructuredData() {
  useEffect(() => {
    // Mevcut structured data script'lerini temizle
    const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
    existingScripts.forEach(script => {
      if (script.textContent.includes('WebApplication') || script.textContent.includes('SoftwareApplication')) {
        script.remove();
      }
    });

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      'name': 'Mihmandar Asistanı',
      'description': 'İslami ve tasavvufi konularda uzman yapay zeka asistanı. Kitaplar, makaleler ve ses kayıtlarından kaynaklı bilgiler sunar.',
      'url': 'https://mihmandar.org/sohbet',
      'applicationCategory': 'EducationalApplication',
      'operatingSystem': 'Web Browser',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'TRY'
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'Mihmandar',
        'url': 'https://mihmandar.org',
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://mihmandar.org/logo-seffaf.svg'
        }
      },
      'featureList': [
        'İslami soru-cevap',
        'Tasavvuf rehberliği',
        'Kaynaklı bilgi sağlama',
        'Manevi danışmanlık',
        'Kitap ve makale referansları'
      ],
      'inLanguage': 'tr-TR',
      'audience': {
        '@type': 'Audience',
        'audienceType': 'İslami ilimler öğrencileri ve araştırmacıları'
      }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData, null, 2);
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return null;
}