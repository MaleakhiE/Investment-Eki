import fs from 'fs';
import path from 'path';

describe('new-password page validation', () => {
  it.each([
    'src/app/(auth)/register/page.tsx',
    'src/app/(auth)/reset-password/page.tsx',
  ])('uses the shared byte-aware validator in %s', (relativePath) => {
    const source = fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

    expect(source).toContain("import { validatePassword } from '@/lib/validation';");
    expect(source).toContain('validatePassword(password)');
    expect(source).not.toContain('maxLength={72}');
  });

  it('does not apply the new-password boundary to legacy credential login', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/app/(auth)/login/page.tsx'),
      'utf8',
    );

    expect(source).not.toContain('validatePassword');
  });
});
