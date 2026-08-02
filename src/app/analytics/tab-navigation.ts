export const ANALYTICS_TABS = ['overview', 'cashflow', 'investment'] as const;
export type AnalyticsTab = typeof ANALYTICS_TABS[number];

export function nextAnalyticsTab(current: AnalyticsTab, key: string): AnalyticsTab | null {
  const index = ANALYTICS_TABS.indexOf(current);
  if (key === 'Home') return ANALYTICS_TABS[0];
  if (key === 'End') return ANALYTICS_TABS[ANALYTICS_TABS.length - 1];
  if (key === 'ArrowRight') return ANALYTICS_TABS[(index + 1) % ANALYTICS_TABS.length];
  if (key === 'ArrowLeft') return ANALYTICS_TABS[(index - 1 + ANALYTICS_TABS.length) % ANALYTICS_TABS.length];
  return null;
}
