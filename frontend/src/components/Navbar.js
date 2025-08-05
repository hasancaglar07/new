// frontend/src/components/Navbar.js
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navLinks = [
  { name: 'Ana Sayfa', href: '/' },
  { name: 'Kitaplık', href: '/kitaplar' },
  { name: 'YouTube Arama', href: '/youtube-arama' },
  { name: 'Video Analizi', href: '/video-analizi' }, 
];

// Mobil menü için animasyon varyantları
const mobileMenuVariants = {
  hidden: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2, ease: "easeOut" }
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeIn" }
  },
};

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-50 border-b border-slate-200/80">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link 
              href="/" 
              className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-green-500"
              onClick={() => setIsMenuOpen(false)}
            >
              Mihmandar
            </Link>
          </div>

          {/* Masaüstü Menüsü */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`relative text-lg font-medium transition-colors duration-200 ${
                    isActive ? 'text-emerald-600' : 'text-slate-600 hover:text-emerald-500'
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <motion.span 
                      layoutId="underline"
                      className="absolute left-0 -bottom-1 block h-0.5 w-full bg-emerald-500"
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Mobil Menü Butonu (Hamburger) */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-700 hover:text-emerald-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">Menüyü aç</span>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobil Menü Paneli */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              variants={mobileMenuVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="md:hidden absolute top-full left-0 w-full bg-white shadow-lg border-t border-slate-200"
            >
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`block px-3 py-3 rounded-md text-base font-medium transition-all ${
                        isActive 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}