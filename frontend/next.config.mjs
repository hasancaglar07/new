/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Backend sunucusu için (PDF sayfaları)
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/pdf/page_image/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/pdf/page_image/**',
      },
      // YouTube video kapak resimleri için (YENİ EKLENEN KISIM)
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