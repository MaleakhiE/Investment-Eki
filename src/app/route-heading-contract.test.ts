import fs from 'node:fs';
import path from 'node:path';

/**
 * Source-level guard for OBJ-103: guarantee exactly one <h1> per route module.
 *
 * Pages delegate their heading to a shared component (PageHeader or AuthShell),
 * each of which renders exactly one <h1>. So the effective heading count for a
 * route module is: literal "<h1" occurrences + "<PageHeader" usages + "<AuthShell"
 * usages. Every targeted route must total exactly one.
 */
function effectiveH1Count(source: string): number {
  const literalH1 = (source.match(/<h1/g) || []).length;
  const pageHeader = (source.match(/<PageHeader/g) || []).length;
  const authShell = (source.match(/<AuthShell/g) || []).length;
  return literalH1 + pageHeader + authShell;
}

const routeFiles = [
  'src/app/budget/page.tsx',
  'src/app/goals/page.tsx',
  'src/app/analytics/page.tsx',
  'src/app/cashflow/page.tsx',
  'src/app/settings/page.tsx',
  'src/app/page.tsx',
  'src/app/(auth)/login/page.tsx',
  'src/app/(auth)/register/page.tsx',
  'src/app/(auth)/reset-password/page.tsx',
  'src/app/(auth)/forgot-password/page.tsx',
];

describe('OBJ-103: exactly one <h1> per page route', () => {
  it.each(routeFiles)('%s declares exactly one <h1>', (route) => {
    const source = fs.readFileSync(path.join(process.cwd(), route), 'utf8');
    expect(effectiveH1Count(source)).toBe(1);
  });
});
