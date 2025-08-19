export default function StructuredData({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Website için genel structured data
export const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Mihmandar.org E-Kütüphanesi",
  "alternateName": "Mihmandar",
  "url": "https://mihmandar.org",
  "description": "İslami kitaplar, ses kayıtları, makaleler ve daha fazlası. İlim ve maneviyat dünyasına açılan kapınız.",
  "inLanguage": "tr-TR",
  "publisher": {
    "@type": "Organization",
    "name": "Mihmandar.org",
    "url": "https://mihmandar.org",
    "logo": {
      "@type": "ImageObject",
      "url": "https://mihmandar.org/mihmandar-logo.svg",
      "width": 400,
      "height": 400
    }
  },
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://mihmandar.org/?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
};

// Kitap için structured data
export function getBookStructuredData(book) {
  const bookTitle = book.kitap_adi || book.kitap || 'Bilinmeyen Kitap';
  const authorName = book.yazar || book.author || book.yazarAdi || book.authorName || 
                    (book.pdf_dosyasi ? book.pdf_dosyasi.split('-').slice(1).join('-').replace('.pdf', '').replace(/_/g, ' ') : 'Bilinmeyen Yazar');
  
  return {
    "@context": "https://schema.org",
    "@type": "Book",
    "name": bookTitle,
    "author": {
      "@type": "Person",
      "name": authorName
    },
    "publisher": {
      "@type": "Organization",
      "name": "Mihmandar.org"
    },
    "url": `https://mihmandar.org/kitaplar/${book.id}`,
    "description": `${bookTitle} - ${authorName} tarafından yazılan bu değerli eseri Mihmandar.org E-Kütüphanesi'nde ücretsiz okuyabilirsiniz.`,
    "inLanguage": "tr-TR",
    "genre": "İslami Eser",
    "bookFormat": "EBook",
    "isAccessibleForFree": true,
    "provider": {
      "@type": "Organization",
      "name": "Mihmandar.org E-Kütüphanesi",
      "url": "https://mihmandar.org"
    }
  };
}

// Makale için structured data
export function getArticleStructuredData(article) {
  const articleTitle = article.baslik || article.title || 'Bilinmeyen Makale';
  const authorName = article.yazar || article.author || 'Mihmandar.org';
  const publishDate = article.tarih || article.created_at || new Date().toISOString();
  const articleContent = article.icerik || article.content || '';
  const cleanContent = articleContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": articleTitle,
    "author": {
      "@type": "Person",
      "name": authorName
    },
    "publisher": {
      "@type": "Organization",
      "name": "Mihmandar.org",
      "logo": {
        "@type": "ImageObject",
        "url": "https://mihmandar.org/mihmandar-logo.svg"
      }
    },
    "datePublished": publishDate,
    "dateModified": article.updated_at || publishDate,
    "url": `https://mihmandar.org/makaleler/${article.id}`,
    "description": cleanContent.length > 160 ? cleanContent.substring(0, 157) + '...' : cleanContent,
    "articleBody": cleanContent,
    "inLanguage": "tr-TR",
    "genre": "İslami Makale",
    "keywords": [articleTitle, authorName, 'İslami Makale', 'Dini Yazı'],
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://mihmandar.org/makaleler/${article.id}`
    }
  };
}

// Organizasyon için structured data
export const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Mihmandar.org",
  "alternateName": "Mihmandar E-Kütüphanesi",
  "url": "https://mihmandar.org",
  "logo": "https://mihmandar.org/mihmandar-logo.svg",
  "description": "İslami kitaplar, ses kayıtları, makaleler ve daha fazlası. İlim ve maneviyat dünyasına açılan kapınız.",
  "foundingDate": "2020",
  "sameAs": [
    "https://twitter.com/mihmandarorg",
    "https://facebook.com/mihmandarorg",
    "https://instagram.com/mihmandarorg"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "availableLanguage": "Turkish"
  },
  "areaServed": "TR",
  "knowsAbout": [
    "İslami Kitaplar",
    "Tasavvuf",
    "Maneviyat",
    "Dini Eğitim",
    "İslami Makaleler"
  ]
};