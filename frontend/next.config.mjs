/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // --- YENİ VE EN ÖNEMLİ EKLEME ---
      // Backend API'nizin çalıştığı Railway sunucusunun adresini buraya ekleyin.
      // Bu satır, Next.js'e bu adresten resim çekme izni verir.
      {
        protocol: 'https',
        hostname: 'new-production-1016.up.railway.app', // BU SİZİN RAILWAY ADRESİNİZ
        port: '',
        pathname: '/**', // Bu sunucudaki tüm yollara izin ver
      },
      // ------------------------------------

      // Yerel geliştirme için mevcut ayarlar (bunlar kalmalı)
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/**',
      },
      // YouTube video kapak resimleri için (bu da kalmalı)
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        port: '',
        pathname: '/**',
      },
      // YouTube thumbnail API için
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      { source: '/namaz', destination: '/namaz/index.html' },
    ];
  },
};

export default nextConfig;