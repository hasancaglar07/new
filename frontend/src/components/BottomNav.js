"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, BookOpen, FileText, Headphones, Video, MessageCircle } from "lucide-react";

const items = [
  { href: "/", label: "Ana Sayfa", icon: Home },
  { href: "/kitaplar", label: "Kitaplar", icon: BookOpen },
  { href: "/makaleler", label: "Makaleler", icon: FileText },
  { href: "/ses-kayitlari", label: "Ses", icon: Headphones },
  { href: "/video-analizi", label: "YouTube", icon: Video },
  { href: "/sohbet", label: "Sohbet", icon: MessageCircle },
];

export default function BottomNav() {
  const pathname = usePathname();
  
  const containerVariants = {
    hidden: { y: 100, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div className="mx-auto max-w-full px-1">
        <motion.div 
          className="mb-1 rounded-xl bg-gradient-to-r from-emerald-500/90 to-teal-500/90 backdrop-blur-xl shadow-lg border-t border-emerald-200/20"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.ul className="grid grid-cols-6 gap-0" variants={containerVariants}>
            {items.map((it, index) => {
              const active = pathname === it.href;
              const IconComponent = it.icon;
              return (
                <motion.li 
                  key={it.href} 
                  className=""
                  variants={itemVariants}
                  whileHover={{ 
                    scale: 1.1,
                    transition: { type: "spring", stiffness: 400, damping: 10 }
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href={it.href}
                    className={`flex flex-col items-center justify-center py-2 px-0.5 text-xs font-medium transition-all duration-200 relative ${
                      active 
                        ? "text-white" 
                        : "text-white/75 hover:text-white"
                    }`}
                  >
                    <motion.div
                      animate={active ? { scale: 1.2, rotate: [0, -10, 10, 0] } : { scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <IconComponent className="h-4 w-4 mb-0.5" strokeWidth={1.5} />
                    </motion.div>
                    <span className="text-[9px] leading-none font-medium">{it.label}</span>
                    {active && (
                      <motion.div
                        className="absolute -top-1 left-1/2 w-1 h-1 bg-white rounded-full"
                        layoutId="activeIndicator"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        style={{ x: "-50%" }}
                      />
                    )}
                  </Link>
                </motion.li>
              );
            })}
          </motion.ul>
        </motion.div>
      </div>
    </nav>
  );
}


