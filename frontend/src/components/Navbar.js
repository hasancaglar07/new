// frontend/src/components/Navbar.js
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// ★★★ Newspaper ikonu eklendi ★★★
import { Menu, X, LayoutGrid, Library, Youtube, Clapperboard, Newspaper } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ★★★ navLinks dizisine "Makaleler" eklendi ★★★
const navLinks = [
  { name: 'Ana Sayfa', href: '/', icon: <LayoutGrid className="h-5 w-5" /> },
  { name: 'Kitaplık', href: '/kitaplar', icon: <Library className="h-5 w-5" /> },
  { name: 'Makaleler', href: '/makaleler', icon: <Newspaper className="h-5 w-5" /> }, // YENİ EKLENDİ
  { name: 'YouTube Arama', href: '/youtube-arama', icon: <Youtube className="h-5 w-5" /> },
  { name: 'Video Analizi', href: '/video-analizi', icon: <Clapperboard className="h-5 w-5" /> }, 
];

// Mobil menü için animasyon varyantları
const mobileMenuVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: { duration: 0.2, ease: "easeOut" }
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeIn" }
  },
};

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 py-3">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="relative flex justify-between items-center h-16 bg-white/80 backdrop-blur-xl rounded-full border border-slate-200/80 shadow-lg shadow-slate-300/10 px-6">
          
          <div className="flex-shrink-0">
            <Link 
              href="/" 
              className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-green-500"
              onClick={() => setIsMenuOpen(false)}
            >
              Mihmandar
            </Link>
          </div>

          <div className="hidden md:flex md:items-center md:space-x-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  title={link.name}
                  className={`relative flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                    isActive 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {link.icon}
                  <span className="hidden lg:inline">{link.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="md:hidden flex items-center">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-full text-slate-700 hover:text-emerald-600 hover:bg-slate-100 focus:outline-none"
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">Menüyü aç</span>
              <AnimatePresence mode="wait">
                  <motion.div
                    key={isMenuOpen ? 'x' : 'menu'}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                   {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                  </motion.div>
              </AnimatePresence>
            </motion.button>
          </div>
          
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                variants={mobileMenuVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="md:hidden absolute top-full left-0 right-0 mt-3 mx-4"
              >
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/80 p-2 space-y-1">
                  {navLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.name}
                        href={link.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={`flex items-center gap-4 px-4 py-3 rounded-lg text-base font-medium transition-all ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {link.icon}
                        {link.name}
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </div>
    </header>
  );
}``