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

  it.each([
    [{ SUPERADMIN_PASSWORD: 'a-strong-bootstrap-password' }, 'SUPERADMIN_EMAIL'],
    [{ SUPERADMIN_EMAIL: 'ekiputra234@gmail.com' }, 'SUPERADMIN_PASSWORD'],
    [{ SUPERADMIN_EMAIL: 'not-an-email', SUPERADMIN_PASSWORD: 'a-strong-bootstrap-password' }, 'valid email'],
    [{ SUPERADMIN_EMAIL: 'ekiputra234@gmail.com', SUPERADMIN_PASSWORD: 'short' }, 'at least 12'],
  ])('fails closed for unsafe bootstrap configuration', (environment, expectedMessage) => {
    expect(() => resolveSeedAdminConfig(environment)).toThrow(expectedMessage);
  });
});
