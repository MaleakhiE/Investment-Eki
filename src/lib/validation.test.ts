import { validatePassword } from './validation';

describe('validatePassword bcrypt boundary', () => {
  it('preserves the existing eight-character minimum', () => {
    expect(validatePassword('1234567')).toEqual({
      valid: false,
      errors: ['Password must be at least 8 characters long'],
    });
    expect(validatePassword('12345678')).toEqual({ valid: true, errors: [] });
  });

  it.each([
    ['72 ASCII bytes', 'a'.repeat(72)],
    ['72 multibyte UTF-8 bytes', '😀'.repeat(18)],
  ])('accepts exactly %s', (_case, password) => {
    expect(new TextEncoder().encode(password)).toHaveLength(72);
    expect(validatePassword(password)).toEqual({ valid: true, errors: [] });
  });

  it.each([
    ['73 ASCII bytes', 'a'.repeat(73)],
    ['73 multibyte UTF-8 bytes', `${'😀'.repeat(18)}a`],
  ])('rejects %s without truncating it', (_case, password) => {
    expect(new TextEncoder().encode(password)).toHaveLength(73);
    expect(validatePassword(password)).toEqual({
      valid: false,
      errors: ['Password must be 72 UTF-8 bytes or fewer'],
    });
  });
});
