import { primaryNavigation } from './navigation';

describe('mobile navigation', () => {
  it('exposes the approved four mobile destinations with icons', () => {
    expect(primaryNavigation.map((item) => item.label)).toEqual(['Home', 'Activity', 'Invest', 'More']);
    expect(primaryNavigation.every((item) => Boolean(item.icon))).toBe(true);
  });
});
