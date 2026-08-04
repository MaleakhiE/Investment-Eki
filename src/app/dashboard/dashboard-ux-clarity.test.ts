import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf8');
const budgetSource = fs.readFileSync(path.join(process.cwd(), 'src/app/budget/page.tsx'), 'utf8');

describe('dashboard UX clarity (iteration 055)', () => {
  it('replaces the ambiguous Sisa Uang / Periode Gajian labels with clear copy', () => {
    expect(source).not.toContain('>Sisa Uang<');
    expect(source).not.toContain('>Periode Gajian<');
    expect(source).toContain('Cashflow periode ini');
    expect(source).toContain('>Net balance<');
  });

  it('surfaces the salary-period dates under the hero net cashflow', () => {
    expect(source).toMatch(/text-4xl lg:text-5xl font-bold mb-1/);
    expect(source).toContain("<p className=\"text-xs text-zinc-500 mb-6\">{periodLabel || 'Periode gajian aktif'}</p>");
  });
});

describe('dashboard empty-state onboarding (iteration 055)', () => {
  it('renders a hero icon, heading, body, and CTA in the new-user empty state', () => {
    expect(source).toContain('Mulai Perjalanan Finansialmu!');
    expect(source).toMatch(/<svg className="w-10 h-10 text-\[#00a88a\]"/);
    expect(source).toMatch(/gradient-accent text-\[#16332f\] font-semibold[\s\S]*Add your first transaction/);
  });
});

describe('budget empty-state onboarding (iteration 055)', () => {
  it('replaces the inline no-budget message with a CTA card containing icon, heading, and button', () => {
    expect(budgetSource).toContain('Create your first budget');
    expect(budgetSource).toContain('<h3 className="text-lg font-bold text-[#16332f] mb-2">No budgets set</h3>');
    expect(budgetSource).toMatch(/onClick=\{\(\) => setShowForm\(true\)\}/);
  });
});
