// frontend/src/components/Navbar.js
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// ★★★ Newspaper ve diğer ikonlar yerinde duruyor ★★★
import { Menu, X, LayoutGrid, Library, Youtube, Clapperboard, Newspaper, Mic, Clock, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// ★★★ Next.js'in Image bileşenini import ediyoruz ★★★
import Image from 'next/image';
import { useEffect } from 'react';
import NamazWidget from '@/components/NamazWidget';

const navLinks = [
  { name: 'Ana Sayfa', href: '/', icon: <LayoutGrid className="h-5 w-5" /> },
  { name: 'AI Sohbet', href: '/sohbet', icon: <MessageSquare className="h-5 w-5" /> },
  { name: 'Kitaplık', href: '/kitaplar', icon: <Library className="h-5 w-5" /> },
  { name: 'Makaleler', href: '/makaleler', icon: <Newspaper className="h-5 w-5" /> },
  { name: 'Ses Kayıtları', href: '/ses-kayitlari', icon: <Mic className="h-5 w-5" /> },
  { name: 'YouTube Arama', href: '/youtube-arama', icon: <Youtube className="h-5 w-5" /> },
  { name: 'Video Analizi', href: '/video-analizi', icon: <Clapperboard className="h-5 w-5" /> }, 
];

const mobileMenuVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.2, ease: "easeOut" } },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: "easeIn" } },
};

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    // Tek sefer: localStorage'tan oku
    try {
      const saved = window.localStorage.getItem('prayer_location');
      if (saved) {
        const obj = JSON.parse(saved);
        if (obj?.lat && obj?.lng) {
          setCoords(prev => (prev?.lat === obj.lat && prev?.lng === obj.lng ? prev : { lat: obj.lat, lng: obj.lng }));
        }
      }
    } catch {}

    // İsteğe bağlı: storage yoksa bir defa cihaz konumunu dene
    if (!coords && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords(prev => (
          prev?.lat === pos.coords.latitude && prev?.lng === pos.coords.longitude
            ? prev
            : { lat: pos.coords.latitude, lng: pos.coords.longitude }
        )),
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [coords]);

  return (
    <header className="sticky top-0 z-50 py-3">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="relative flex justify-between items-center h-16 bg-white/80 backdrop-blur-xl rounded-full border border-slate-200/80 shadow-lg shadow-slate-300/10 px-6">
          
          {/* ★★★ LOGO ALANI DEĞİŞTİRİLDİ ★★★ */}
          <div className="flex-shrink-0 flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
              className="relative"
            >
              <Link href="/" onClick={() => setIsMenuOpen(false)}>
                <Image src="/logo-top.svg" alt="Mihmandar" width={48} height={48} className="h-10 w-10" priority />
              </Link>
            </motion.div>
            {/* Sıradaki namaz (küçük) */}
            <div className="block">
              {coords && (
                <motion.div
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-xs sm:text-sm font-semibold text-emerald-700 truncate max-w-[220px] sm:max-w-none"
                >
                  <HeaderNextPrayer coords={coords} />
                </motion.div>
              )}
            </div>
          </div>

          {/* Menü linkleri ve diğer kısımlar aynı kalıyor */}
          <div className="hidden md:flex md:items-center md:space-x-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  title={link.name}
                  className={`relative flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 touch-target ${
                    isActive 
                      ? 'bg-primary/10 text-primary' 
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
              className="inline-flex items-center justify-center p-2 rounded-full text-slate-700 hover:text-primary hover:bg-slate-100 focus:outline-none touch-target"
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
                        className={`flex items-center gap-4 px-4 py-3 rounded-lg text-base font-medium transition-all touch-target ${
                          isActive 
                            ? 'bg-primary/10 text-primary' 
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
}

function HeaderNextPrayer({ coords }) {
  // Küçük kullanım: sadece başlık satırı için NamazWidget'ın hesaplamasını reuse edemiyoruz; hızlı fetch yapıyoruz.
  const [text, setText] = useState(null);
  const [pulse, setPulse] = useState(false);
  const [minuteKey, setMinuteKey] = useState(null); // dakika değişiminde animasyon tetiklemek için
  const [targetDate, setTargetDate] = useState(null); // bir sonraki vaktin Date karşılığı
  const [nameTime, setNameTime] = useState({ name: null, time: null });
  useEffect(() => {
    const run = async () => {
      try {
        const url = new URL('https://vakit.vercel.app/api/timesForGPS');
        url.searchParams.set('lat', String(coords.lat));
        url.searchParams.set('lng', String(coords.lng));
        url.searchParams.set('date', new Date().toISOString().slice(0,10));
        url.searchParams.set('days', '1');
        url.searchParams.set('timezoneOffset', String(-new Date().getTimezoneOffset()));
        url.searchParams.set('calculationMethod', 'Turkey');
        url.searchParams.set('lang', 'tr');
        const res = await fetch(url.toString());
        const payload = await res.json();
        let mapped;
        if (payload?.times && !Array.isArray(payload.times) && typeof payload.times === 'object') {
          const dk = Object.keys(payload.times)[0];
          const arr = payload.times[dk] || [];
          const clean = (t) => (t ? String(t).split(' ')[0] : null);
          mapped = { imsak: clean(arr[0]), gunes: clean(arr[1]), ogle: clean(arr[2]), ikindi: clean(arr[3]), aksam: clean(arr[4]), yatsi: clean(arr[5]) };
        } else {
          const first = Array.isArray(payload?.times) ? (payload.times[0] || {}) : (payload?.data || {});
          const clean = (t) => (t ? String(t).split(' ')[0] : null);
          mapped = { imsak: clean(first.fajr), gunes: clean(first.sunrise), ogle: clean(first.dhuhr), ikindi: clean(first.asr), aksam: clean(first.maghrib), yatsi: clean(first.isha) };
        }
        const order = [["Akşam", mapped.aksam],["Yatsı", mapped.yatsi],["İmsak", mapped.imsak],["Güneş", mapped.gunes],["Öğle", mapped.ogle],["İkindi", mapped.ikindi]]; // görünüm için akış önemsiz; aşağıda hesap
        const names = [["İmsak", mapped.imsak],["Güneş", mapped.gunes],["Öğle", mapped.ogle],["İkindi", mapped.ikindi],["Akşam", mapped.aksam],["Yatsı", mapped.yatsi]];
        const now = new Date();
        let picked = null;
        for (const [name, v] of names) {
          if (!v) continue;
          const [hh, mm] = v.split(":").map(Number);
          const cand = new Date(); cand.setHours(hh, mm, 0, 0);
          if (cand >= now) { picked = { name, time: v, remaining: Math.floor((cand - now)/60000) }; break; }
        }
        if (!picked && mapped.imsak) {
          const [hh, mm] = mapped.imsak.split(":").map(Number);
          const cand = new Date(Date.now()+86400000); cand.setHours(hh, mm, 0, 0);
          picked = { name: 'İmsak', time: mapped.imsak, remaining: Math.floor((cand - new Date())/60000) };
        }
        if (picked) {
          // Hedef tarihi kur
          const [hh, mm] = picked.time.split(":").map(Number);
          const d = new Date(); d.setHours(hh, mm, 0, 0);
          // ertesi güne taşma durumu
          if (d.getTime() < Date.now()) d.setTime(d.getTime() + 86400000);
          setTargetDate(d);
          setNameTime({ name: picked.name, time: picked.time });
          // İlk metni yaz
          const rem = picked.remaining;
          const hours = Math.floor(rem / 60);
          const mins = rem % 60;
          const remText = hours >= 1 ? `${hours} sa. ${mins} dk.` : `${mins} dk`;
          setMinuteKey(`${hours}:${mins}`);
          setText(`${picked.name} — ${picked.time} (≈ ${remText})`);
        }
      } catch {}
    };
    run();
  }, [coords?.lat, coords?.lng]);

  // Her saniye kalan süreyi güncelle; dakika değişince highlight uygula
  useEffect(() => {
    if (!targetDate) return;
    const tick = () => {
      const diffMin = Math.max(0, Math.floor((targetDate.getTime() - Date.now()) / 60000));
      const hours = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      const remText = hours >= 1 ? `${hours} sa. ${mins} dk.` : `${mins} dk`;
      const keyNow = `${hours}:${mins}`;
      // dakika değiştiyse nazik vurgu
      if (minuteKey !== keyNow) {
        setPulse(true);
        setTimeout(() => setPulse(false), 650);
        setMinuteKey(keyNow);
      }
      setText(`${nameTime.name ?? ''} — ${nameTime.time ?? ''} (≈ ${remText})`);
    };
    const id = window.setInterval(tick, 1000);
    tick();
    return () => window.clearInterval(id);
  }, [targetDate, nameTime, minuteKey]);
  return text ? (
    <motion.span
      animate={pulse ? { scale: 1.05, color: '#065f46', backgroundColor: 'rgba(16,185,129,0.08)', paddingInline: 8, borderRadius: 999 } : { scale: 1, color: '#047857', backgroundColor: 'rgba(0,0,0,0)', paddingInline: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 16 }}
    >
      {text}
    </motion.span>
  ) : <span>Konum bekleniyor…</span>;
}