'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', emoji: '🏠' },
  { href: '/cashflow', label: 'Transaksi', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', emoji: '💳' },
  { href: '/investments', label: 'Investasi', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', emoji: '📈' },
  { href: '/analytics', label: 'Analisis', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', emoji: '📊' },
];

const moreItems = [
  { href: '/budget', label: 'Budget', emoji: '💰' },
  { href: '/goals', label: 'Goals', emoji: '🎯' },
  { href: '/settings', label: 'Pengaturan', emoji: '⚙️' },
];

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: SidebarProps) {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-20 hidden h-full w-64 flex-col overflow-y-auto border-r border-[#dcece8] bg-white lg:flex">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl gradient-accent flex items-center justify-center shadow-lg shadow-[#00d4aa]/20">
              <span className="text-xl">💎</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#16332f]">FinTrack</h1>
              <p className="text-[10px] text-[#63807a]">Smart Finance</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${isActive ? 'bg-[#d8f7ef] text-[#087f6b]' : 'text-[#63807a] hover:bg-[#f3faf8] hover:text-[#16332f]'}`}>
                <span className="text-lg">{item.emoji}</span>
                <span className="font-medium text-sm">{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00d4aa]"></div>}
              </Link>
            );
          })}
          
          <div className="pt-3 mt-3 border-t border-[#dcece8]">
            <p className="px-3 text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-2">Lainnya</p>
            {moreItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isActive ? 'bg-[#d8f7ef] text-[#087f6b]' : 'text-[#63807a] hover:bg-[#f3faf8] hover:text-[#16332f]'}`}>
                  <span className="text-base">{item.emoji}</span>
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
        
        <div className="p-3 border-t border-[#dcece8]">
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-400 w-full transition-all">
            <span className="text-base">👋</span>
            <span className="font-medium text-sm">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation - Modern style */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 nav-blur border-t border-[#dcece8] z-30 safe-area-bottom">
        <div className="flex items-center justify-around h-20 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center justify-center flex-1 py-2 transition-all ${isActive ? 'text-[#00d4aa]' : 'text-zinc-500'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-1 transition-all ${isActive ? 'bg-[#00d4aa]/10 scale-110' : ''}`}>
                  <span className="text-2xl">{item.emoji}</span>
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-[#00d4aa]' : 'text-zinc-500'}`}>{item.label}</span>
              </Link>
            );
          })}
          <button onClick={() => setShowMore(!showMore)} className={`flex flex-col items-center justify-center flex-1 py-2 transition-all ${showMore ? 'text-[#00d4aa]' : 'text-zinc-500'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-1 transition-all ${showMore ? 'bg-[#00d4aa]/10' : ''}`}>
              <span className="text-2xl">⋯</span>
            </div>
            <span className="text-[10px] font-medium">Lainnya</span>
          </button>
        </div>
      </nav>

      {/* Mobile More Menu - Bottom Sheet */}
      {showMore && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/60 z-40 animate-fade-in" onClick={() => setShowMore(false)} />
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-50 animate-slide-up safe-area-bottom shadow-[0_-12px_40px_rgba(8,127,107,0.12)]">
            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mt-3 mb-6" />
            <div className="px-6 pb-8">
              <h3 className="text-lg font-bold text-[#16332f] mb-4">Menu Lainnya</h3>
              <div className="grid grid-cols-3 gap-4">
                {moreItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setShowMore(false)} className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover-scale ${isActive ? 'bg-[#00d4aa]/10' : 'bg-[#f5fbf9]'}`}>
                      <span className="text-3xl">{item.emoji}</span>
                      <span className={`text-xs font-medium ${isActive ? 'text-[#00d4aa]' : 'text-zinc-300'}`}>{item.label}</span>
                    </Link>
                  );
                })}
                <button onClick={() => { setShowMore(false); signOut({ callbackUrl: '/login' }); }} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-red-500/10 transition-all hover-scale">
                  <span className="text-3xl">👋</span>
                  <span className="text-xs font-medium text-red-400">Keluar</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mobile Header - Minimal */}
      <header className="lg:hidden glass sticky top-0 z-20 border-b border-[#dcece8] safe-area-top">
        <div className="flex items-center justify-between px-5 h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
              <span className="text-lg">💎</span>
            </div>
            <span className="text-lg font-bold text-[#16332f]">FinTrack</span>
          </div>
          <Link href="/settings" className="w-10 h-10 rounded-xl bg-[#f5fbf9] flex items-center justify-center text-zinc-400 hover:bg-[#e9f5f2] transition-colors">
            <span className="text-lg">⚙️</span>
          </Link>
        </div>
      </header>
    </>
  );
}
