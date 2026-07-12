export type IconName = 'home' | 'activity' | 'trend' | 'grid' | 'wallet' | 'target' | 'chart' | 'settings' | 'mail' | 'logout' | 'plus' | 'chevron';

const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M9.5 20v-6h5v6"/></>,
  activity: <><path d="M4 7h16M4 17h16"/><path d="M7 4v6M17 14v6"/></>,
  trend: <><path d="m4 17 5-5 4 3 7-8"/><path d="M15 7h5v5"/></>,
  grid: <><rect x="4" y="4" width="6" height="6" rx="2"/><rect x="14" y="4" width="6" height="6" rx="2"/><rect x="4" y="14" width="6" height="6" rx="2"/><rect x="14" y="14" width="6" height="6" rx="2"/></>,
  wallet: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5z"/><path d="M15 10h6v5h-6a2.5 2.5 0 0 1 0-5Z"/></>,
  target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="m14 10 6-6"/></>,
  chart: <><path d="M5 20V10M12 20V4M19 20v-7"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.4 3.1a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2L3 14.5l2 3.4 2.4-1a8 8 0 0 0 1.7 1l.4 3.1h5l.4-3.1a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2.1-1.5a7 7 0 0 0 .1-1Z"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></>,
  logout: <><path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  chevron: <path d="m9 6 6 6-6 6"/>,
};

export default function AppIcon({ name, size = 22, className = '', label }: { name: IconName; size?: number; className?: string; label?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden={label ? undefined : true} aria-label={label}>{paths[name]}</svg>;
}
