"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Anasayfa", icon: "🏠" },
  { href: "/kitaplar", label: "Kitaplar", icon: "📚" },
  { href: "/makaleler", label: "Makaleler", icon: "📰" },
  { href: "/ses-kayitlari", label: "Ses", icon: "🎧" },
  { href: "/video-analizi", label: "YouTube", icon: "▶️" },
  { href: "/namaz/index.html", label: "Namaz", icon: "🕌" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div className="mx-auto max-w-3xl">
        <div className="m-3 rounded-2xl border border-slate-200/60 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-lg">
          <ul className="grid grid-cols-3 sm:grid-cols-6">
            {items.map((it) => {
              const active = pathname === it.href;
              return (
                <li key={it.href} className="">
                  <Link
                    href={it.href}
                    className={`flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors ${
                      active ? "text-primary" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span className="text-lg leading-none">{it.icon}</span>
                    <span className="mt-0.5">{it.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}


