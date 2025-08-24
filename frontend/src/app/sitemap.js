const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default async function sitemap() {
  const baseUrl = 'https://mihmandar.org';
  
  // Statik sayfalar
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/kitaplar`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/makaleler`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/ses-kayitlari`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sohbet`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/video-analizleri`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ];

  // Dinamik sayfalar için API'den veri çek
  let dynamicPages = [];
  
  try {
    // Kitaplar için
    const booksResponse = await fetch(`${API_BASE_URL}/books`, {
      next: { revalidate: 86400 } // 24 saat cache
    });
    
    if (booksResponse.ok) {
      const books = await booksResponse.json();
      const bookPages = books.map((book) => ({
        url: `${baseUrl}/kitaplar/${book.id}`,
        lastModified: new Date(book.updated_at || book.created_at || new Date()),
        changeFrequency: 'monthly',
        priority: 0.8,
      }));
      dynamicPages = [...dynamicPages, ...bookPages];
    }
  } catch (error) {
    console.error('Error fetching books for sitemap:', error);
  }

  try {
    // Makaleler için
    const articlesResponse = await fetch(`${API_BASE_URL}/articles`, {
      next: { revalidate: 86400 } // 24 saat cache
    });
    
    if (articlesResponse.ok) {
      const articles = await articlesResponse.json();
      const articlePages = articles.map((article) => ({
        url: `${baseUrl}/makaleler/${article.id}`,
        lastModified: new Date(article.updated_at || article.created_at || new Date()),
        changeFrequency: 'monthly',
        priority: 0.7,
      }));
      dynamicPages = [...dynamicPages, ...articlePages];
    }
  } catch (error) {
    console.error('Error fetching articles for sitemap:', error);
  }

  try {
    // Sohbet geçmişi için
    const chatHistoryResponse = await fetch(`${API_BASE_URL}/chat/history`, {
      next: { revalidate: 3600 } // 1 saat cache (daha sık güncellenen içerik)
    });
    
    if (chatHistoryResponse.ok) {
      const chatHistory = await chatHistoryResponse.json();
      const chatPages = chatHistory
        .filter(chat => chat.slug && chat.is_public !== false) // Sadece slug'ı olan ve public olan sohbetler
        .map((chat) => ({
          url: `${baseUrl}/sohbet/${chat.slug}`,
          lastModified: new Date(chat.updated_at || chat.created_at || new Date()),
          changeFrequency: 'weekly',
          priority: 0.6,
        }));
      dynamicPages = [...dynamicPages, ...chatPages];
    }
  } catch (error) {
    console.error('Error fetching chat history for sitemap:', error);
  }

  return [...staticPages, ...dynamicPages];
}