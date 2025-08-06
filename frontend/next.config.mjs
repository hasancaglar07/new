/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // --- YENİ VE EN ÖNEMLİ EKLEME ---
      // Backend API'nizin çalıştığı Railway sunucusunun adresini buraya ekleyin.
      // Örnek adresi kendi adresinizle değiştirmeyi unutmayın!
      {
        protocol: 'https',
        hostname: 'new-production-1016.up.railway.app', // KENDİ RAILWAY ADRESİNİZİ YAZIN
        port: '',
        pathname: '/**',
      },
      // ------------------------------------

      // Yerel geliştirme için mevcut ayarlar
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
      // YouTube video kapak resimleri için
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;