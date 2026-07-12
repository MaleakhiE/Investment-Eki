'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';
import AppIcon from '@/components/ui/AppIcon';
import { moreNavigation, primaryNavigation, type NavigationItem } from './navigation';

function NavLink({ item, pathname, onClick }: { item: NavigationItem; pathname: string; onClick?: () => void }) {
  const active = item.match(pathname);
  return <Link href={item.href} onClick={onClick} className={`app-nav-link ${active ? 'is-active' : ''}`}><AppIcon name={item.icon}/><span>{item.label}</span></Link>;
}

export default function Sidebar(_props: { mobileMenuOpen?: boolean; setMobileMenuOpen?: (open: boolean) => void } = {}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [moreOpen, setMoreOpen] = useState(false);
  const extraItems: NavigationItem[] = session?.user?.role === 'SUPERADMIN'
    ? [...moreNavigation, { label: 'Email delivery', href: '/superadmin/smtp', icon: 'mail', match: (path) => path.startsWith('/superadmin') }]
    : moreNavigation;

  return <>
    <aside className="app-sidebar">
      <Link href="/dashboard" className="app-brand"><span className="app-brand-mark">F</span><span><strong>FinTrack</strong><small>Personal finance</small></span></Link>
      <nav aria-label="Primary navigation" className="app-sidebar-nav">
        {primaryNavigation.slice(0, 3).map((item) => <NavLink key={item.href} item={item} pathname={pathname}/>)}
        <p className="app-nav-section">Plan and insights</p>
        {extraItems.map((item) => <NavLink key={item.href} item={item} pathname={pathname}/>)}
      </nav>
      <button onClick={() => signOut({ callbackUrl: '/login' })} className="app-nav-link app-signout"><AppIcon name="logout"/><span>Sign out</span></button>
    </aside>

    <header className="app-mobile-header"><Link href="/dashboard" className="app-brand"><span className="app-brand-mark">F</span><strong>FinTrack</strong></Link><Link href="/settings" className="app-avatar" aria-label="Open settings">{session?.user?.email?.slice(0, 1).toUpperCase() || 'A'}</Link></header>

    <nav className="app-bottom-nav" aria-label="Mobile navigation">
      {primaryNavigation.map((item) => item.href === '#more'
        ? <button key={item.label} type="button" onClick={() => setMoreOpen(true)} className={`app-bottom-link ${moreOpen ? 'is-active' : ''}`}><AppIcon name={item.icon}/><span>{item.label}</span></button>
        : <Link key={item.href} href={item.href} className={`app-bottom-link ${item.match(pathname) ? 'is-active' : ''}`}><AppIcon name={item.icon}/><span>{item.label}</span></Link>)}
    </nav>

    {moreOpen && <div className="app-sheet-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMoreOpen(false); }}>
      <section className="app-sheet" role="dialog" aria-modal="true" aria-labelledby="more-title"><div className="app-sheet-handle"/><div className="app-sheet-heading"><div><p className="app-eyebrow">Navigation</p><h2 id="more-title">More</h2></div><button type="button" onClick={() => setMoreOpen(false)} className="app-sheet-close">Close</button></div><div className="app-more-grid">{extraItems.map((item) => <NavLink key={item.href} item={item} pathname={pathname} onClick={() => setMoreOpen(false)}/>)}</div><button onClick={() => signOut({ callbackUrl: '/login' })} className="app-nav-link app-signout"><AppIcon name="logout"/><span>Sign out</span></button></section>
    </div>}
  </>;
}
