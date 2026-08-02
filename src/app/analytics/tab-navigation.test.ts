import { nextAnalyticsTab } from './tab-navigation';

describe('analytics tab keyboard navigation', () => {
  it.each([
    ['overview', 'ArrowRight', 'cashflow'],
    ['investment', 'ArrowRight', 'overview'],
    ['overview', 'ArrowLeft', 'investment'],
    ['cashflow', 'Home', 'overview'],
    ['cashflow', 'End', 'investment'],
    ['cashflow', 'Enter', null],
  ] as const)('moves from %s with %s', (current, key, expected) => {
    expect(nextAnalyticsTab(current, key)).toBe(expected);
  });
});
