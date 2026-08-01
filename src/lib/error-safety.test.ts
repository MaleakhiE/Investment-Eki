import { safeDatabaseErrorCode } from './error-safety';

describe('safeDatabaseErrorCode', () => {
  it.each(['P1001', 'P2002', 'P2034'])('keeps allowlisted Prisma code %s', (code) => {
    expect(safeDatabaseErrorCode({ code })).toBe(code);
  });

  it.each([
    undefined,
    null,
    new Error('private SQL and financial details'),
    { code: 'private-code', message: 'private details' },
    { code: 'P2002; DROP TABLE transactions' },
  ])('classifies unsafe value as UNCLASSIFIED', (error) => {
    expect(safeDatabaseErrorCode(error)).toBe('UNCLASSIFIED');
  });
});
