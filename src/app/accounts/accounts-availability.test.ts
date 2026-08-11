import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/accounts/page.tsx'), 'utf8');

describe('accounts availability UX', () => {
  it('distinguishes load failure from an empty account list and exposes retry', () => {
    expect(source).toContain('Account data is unavailable');
    expect(source).toContain('Retry loading accounts');
    expect(source).toContain('error ?');
    expect(source).toContain('onClick={() => { setLoading(true); void loadAccounts(); }}');
  });
});
