import fs from 'node:fs';
import path from 'node:path';

const registerSource = fs.readFileSync(path.join(process.cwd(), 'src/app/(auth)/register/page.tsx'), 'utf8');
const resetSource = fs.readFileSync(path.join(process.cwd(), 'src/app/(auth)/reset-password/page.tsx'), 'utf8');

describe('auth form validation errors accessibility', () => {
  it('register page error container uses role=alert + aria-live=assertive', () => {
    expect(registerSource).toContain('role="alert"');
    expect(registerSource).toContain('aria-live="assertive"');
    expect(registerSource).toContain('bg-red-500/10');
  });

  it('reset-password page error container uses role=alert + aria-live=assertive', () => {
    expect(resetSource).toContain('role="alert"');
    expect(resetSource).toContain('aria-live="assertive"');
  });
});