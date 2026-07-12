import type { IconName } from '@/components/ui/AppIcon';

export type NavigationItem = { label: string; href: string; icon: IconName; match: (pathname: string) => boolean };

export const primaryNavigation: NavigationItem[] = [
  { label: 'Home', href: '/dashboard', icon: 'home', match: (path) => path === '/dashboard' },
  { label: 'Activity', href: '/cashflow', icon: 'activity', match: (path) => path.startsWith('/cashflow') },
  { label: 'Invest', href: '/investments', icon: 'trend', match: (path) => path.startsWith('/investments') },
  { label: 'More', href: '#more', icon: 'grid', match: () => false },
];

export const moreNavigation: NavigationItem[] = [
  { label: 'Analytics', href: '/analytics', icon: 'chart', match: (path) => path.startsWith('/analytics') },
  { label: 'Budgets', href: '/budget', icon: 'wallet', match: (path) => path.startsWith('/budget') },
  { label: 'Goals', href: '/goals', icon: 'target', match: (path) => path.startsWith('/goals') },
  { label: 'Settings', href: '/settings', icon: 'settings', match: (path) => path.startsWith('/settings') },
];
