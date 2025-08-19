import { notFound } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function getBook(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/book/${id}`, {
      next: { revalidate: 3600 } // 1 saat cache
    });
    
    if (!res.ok) {
      return null;
    }
    
    return res.json();
  } catch (error) {
    console.error('Error fetching book:', error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const book = await getBook(params.id);
  
  if (!book) {
    return {
      title: 'Kitap Bulunamadı - Mihmandar.org',
      description: 'Aradığınız kitap bulunamadı.',
    };
  }

  const bookTitle = book.kitap_adi || book.kitap || 'Bilinmeyen Kitap';
  const authorName = book.yazar || book.author || book.yazarAdi || book.authorName || 
                    (book.pdf_dosyasi ? book.pdf_dosyasi.split('-').slice(1).join('-').replace('.pdf', '').replace(/_/g, ' ') : 'Bilinmeyen Yazar');
  
  const description = `${bookTitle} - ${authorName} tarafından yazılan bu değerli eseri Mihmandar.org E-Kütüphanesi'nde ücretsiz okuyabilirsiniz.`;
  const pageUrl = `https://mihmandar.org/kitaplar/${params.id}`;
  
  return {
    title: `${bookTitle} - ${authorName} | Mihmandar.org E-Kütüphanesi`,
    description: description,
    keywords: [bookTitle, authorName, 'islami kitap', 'pdf kitap', 'mihmandar', 'e-kütüphane', 'ücretsiz kitap'],
    authors: [{ name: authorName }],
    openGraph: {
      title: `${bookTitle} - ${authorName}`,
      description: description,
      url: pageUrl,
      siteName: 'Mihmandar.org E-Kütüphanesi',
      images: [
        {
          url: '/mihmandar-logo.svg',
          width: 1200,
          height: 630,
          alt: `${bookTitle} - Mihmandar.org E-Kütüphanesi`,
        },
      ],
      locale: 'tr_TR',
      type: 'article',
      article: {
        authors: [authorName],
        section: 'Kitaplar',
        tags: [bookTitle, authorName, 'İslami Kitap'],
      },
    },
    twitter: {
      card: 'summary_large_image',
      title: `${bookTitle} - ${authorName}`,
      description: description,
      images: ['/mihmandar-logo.svg'],
    },
    alternates: {
      canonical: `/kitaplar/${params.id}`,
    },
    other: {
      'book:author': authorName,
      'book:title': bookTitle,
      'book:genre': 'İslami Eser',
    },
  };
}

export default function BookLayout({ children }) {
  return children;
}