import { notFound } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function getArticle(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/article/${id}`, {
      next: { revalidate: 3600 } // 1 saat cache
    });
    
    if (!res.ok) {
      return null;
    }
    
    return res.json();
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const article = await getArticle(id);
  
  if (!article) {
    return {
      title: 'Makale Bulunamadı - Mihmandar.org',
      description: 'Aradığınız makale bulunamadı.',
    };
  }

  const articleTitle = article.baslik || article.title || 'Bilinmeyen Makale';
  const authorName = article.yazar || article.author || 'Mihmandar.org';
  const articleContent = article.icerik || article.content || '';
  
  // İçerikten ilk 160 karakteri al (meta description için)
  const cleanContent = articleContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const description = cleanContent.length > 160 
    ? cleanContent.substring(0, 157) + '...'
    : cleanContent || `${articleTitle} - ${authorName} tarafından yazılan bu değerli makaleyi Mihmandar.org E-Kütüphanesi'nde okuyabilirsiniz.`;
  
  const pageUrl = `https://mihmandar.org/makaleler/${id}`;
  const publishDate = article.tarih || article.created_at || new Date().toISOString();
  
  return {
    title: `${articleTitle} - ${authorName} | Mihmandar.org E-Kütüphanesi`,
    description: description,
    keywords: [articleTitle, authorName, 'islami makale', 'dini yazı', 'mihmandar', 'e-kütüphane'],
    authors: [{ name: authorName }],
    openGraph: {
      title: `${articleTitle} - ${authorName}`,
      description: description,
      url: pageUrl,
      siteName: 'Mihmandar.org E-Kütüphanesi',
      images: [
        {
          url: '/mihmandar-logo.svg',
          width: 1200,
          height: 630,
          alt: `${articleTitle} - Mihmandar.org E-Kütüphanesi`,
        },
      ],
      locale: 'tr_TR',
      type: 'article',
      article: {
        authors: [authorName],
        publishedTime: publishDate,
        section: 'Makaleler',
        tags: [articleTitle, authorName, 'İslami Makale'],
      },
    },
    twitter: {
      card: 'summary_large_image',
      title: `${articleTitle} - ${authorName}`,
      description: description,
      images: ['/mihmandar-logo.svg'],
    },
    alternates: {
      canonical: `/makaleler/${id}`,
    },
    other: {
      'article:author': authorName,
      'article:title': articleTitle,
      'article:published_time': publishDate,
    },
  };
}

export default function ArticleLayout({ children }) {
  return children;
}