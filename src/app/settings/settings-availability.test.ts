import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/settings/page.tsx'), 'utf8');

describe('settings availability contract', () => {
  it('fails closed with retryable settings and notification states', () => {
    expect(source).toContain("if (!res.ok) throw new Error('Settings unavailable')");
    expect(source).toContain("if (!res.ok) throw new Error('Notification settings unavailable')");
    expect(source).toContain('Settings are unavailable.');
    expect(source).toContain('Notification settings are unavailable.');
    expect(source).toContain('Retry loading notifications');
    expect(source).toContain('role="alert"');
    expect(source).toContain('void fetchNotifSettings();');
  });
});
