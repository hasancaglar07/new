export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/_next/'],
    },
    sitemap: 'https://mihmandar.org/sitemap.xml',
    host: 'https://mihmandar.org',
  };
}