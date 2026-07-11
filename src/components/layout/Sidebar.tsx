'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Home' },
  { href: '/cashflow', label: 'Transaksi' },
  { href: '/investments', label: 'Investasi' },
  { href: '/analytics', label: 'Analisis' },
];

const moreItems = [
  { href: '/budget', label: 'Budget' },
  { href: '/goals', label: 'Goals' },
  { href: '/settings', label: 'Pengaturan' },
];

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export default function Sidebar(_props: SidebarProps) {
  void _props;
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-20 hidden h-full w-64 flex-col overflow-y-auto border-r border-[#dcece8] bg-white lg:flex">
        <div className="p-5">
          <div className="flex items-center gap-3">
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
              <Link key={item.href} href={item.href} className={`border-l-2 px-3 py-3 block rounded-r-xl transition-all ${isActive ? 'border-[#00d4aa] bg-[#d8f7ef] font-semibold text-[#087f6b]' : 'border-transparent text-[#63807a] hover:bg-[#f3faf8] hover:text-[#16332f]'}`}>
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
          
          <div className="pt-3 mt-3 border-t border-[#dcece8]">
            <p className="px-3 text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-2">Lainnya</p>
            {moreItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={`block border-l-2 px-3 py-2.5 rounded-r-xl transition-all ${isActive ? 'border-[#00d4aa] bg-[#d8f7ef] font-semibold text-[#087f6b]' : 'border-transparent text-[#63807a] hover:bg-[#f3faf8] hover:text-[#16332f]'}`}>
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
        
        <div className="p-3 border-t border-[#dcece8]">
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="px-3 py-2.5 rounded-xl text-left text-zinc-400 hover:bg-red-500/10 hover:text-red-400 w-full transition-all">
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
              <Link key={item.href} href={item.href} className={`flex items-center justify-center flex-1 border-t-2 py-5 transition-all ${isActive ? 'border-[#00d4aa] font-semibold text-[#087f6b]' : 'border-transparent text-zinc-500'}`}>
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
          <button onClick={() => setShowMore(!showMore)} className={`flex flex-col items-center justify-center flex-1 py-2 transition-all ${showMore ? 'text-[#00d4aa]' : 'text-zinc-500'}`}>
            <span className="text-xs font-medium">Lainnya</span>
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
                    <Link key={item.href} href={item.href} onClick={() => setShowMore(false)} className={`p-4 text-center rounded-2xl transition-all hover-scale ${isActive ? 'border border-[#00d4aa] bg-[#00d4aa]/10' : 'border border-transparent bg-[#f5fbf9]'}`}>
                      <span className={`text-xs font-medium ${isActive ? 'text-[#00d4aa]' : 'text-zinc-300'}`}>{item.label}</span>
                    </Link>
                  );
                })}
                <button onClick={() => { setShowMore(false); signOut({ callbackUrl: '/login' }); }} className="p-4 rounded-2xl bg-red-500/10 transition-all hover-scale">
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
            <span className="text-lg font-bold text-[#16332f]">FinTrack</span>
          </div>
          <Link href="/settings" className="rounded-xl bg-[#f5fbf9] px-3 py-2 text-sm text-zinc-500 hover:bg-[#e9f5f2] transition-colors">
            Pengaturan
          </Link>
        </div>
      </header>
    </>
  );
}
