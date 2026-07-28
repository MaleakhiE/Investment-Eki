import { resolveSeedAdminConfig } from '../../prisma/seed-config';

describe('seed superadmin configuration', () => {
  it('normalizes the configured owner email and accepts a strong bootstrap password', () => {
    expect(resolveSeedAdminConfig({
      SUPERADMIN_EMAIL: '  ekiputra234@gmail.com  ',
      SUPERADMIN_PASSWORD: 'a-strong-bootstrap-password',
    })).toEqual({
      email: 'ekiputra234@gmail.com',
      password: 'a-strong-bootstrap-password',
    });
  });

  it('accepts exactly 72 UTF-8 password bytes', () => {
    expect(resolveSeedAdminConfig({
      SUPERADMIN_EMAIL: 'owner@example.com',
      SUPERADMIN_PASSWORD: '😀'.repeat(18),
    }).password).toBe('😀'.repeat(18));
  });

  it.each([
    [{ SUPERADMIN_PASSWORD: 'a-strong-bootstrap-password' }, 'SUPERADMIN_EMAIL'],
    [{ SUPERADMIN_EMAIL: 'ekiputra234@gmail.com' }, 'SUPERADMIN_PASSWORD'],
    [{ SUPERADMIN_EMAIL: 'not-an-email', SUPERADMIN_PASSWORD: 'a-strong-bootstrap-password' }, 'valid email'],
    [{ SUPERADMIN_EMAIL: 'ekiputra234@gmail.com', SUPERADMIN_PASSWORD: 'short' }, 'at least 12'],
    [{ SUPERADMIN_EMAIL: 'ekiputra234@gmail.com', SUPERADMIN_PASSWORD: `${'😀'.repeat(18)}a` }, '72 UTF-8 bytes or fewer'],
  ])('fails closed for unsafe bootstrap configuration', (environment, expectedMessage) => {
    expect(() => resolveSeedAdminConfig(environment)).toThrow(expectedMessage);
  });
});
