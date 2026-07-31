import { encrypt, encryptNumber, decryptNumber } from './encryption';

const ORIGINAL_KEY = process.env.ENCRYPTION_KEY;

beforeAll(() => {
  process.env.ENCRYPTION_KEY = 'test-encryption-key-000000000000';
});

afterAll(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.ENCRYPTION_KEY;
  } else {
    process.env.ENCRYPTION_KEY = ORIGINAL_KEY;
  }
});

describe('decryptNumber strict parsing', () => {
  it.each([0, 1, -1, 1234.56, -1234.56, 0.25])(
    'round-trips finite numeric values: %s',
    (value) => {
      expect(decryptNumber(encryptNumber(value))).toBe(value);
    },
  );

  it('rejects trailing non-numeric suffixes such as "100junk"', () => {
    const ciphertext = encrypt('100junk');
    expect(() => decryptNumber(ciphertext)).toThrow(
      'Decrypted value is not a valid number',
    );
  });

  it.each(['', '  ', 'abc', 'Infinity', '-Infinity', 'NaN', '1e', '0x10'])(
    'rejects non-canonical numeric strings: %s',
    (raw) => {
      const ciphertext = encrypt(raw);
      expect(() => decryptNumber(ciphertext)).toThrow(
        'Decrypted value is not a valid number',
      );
    },
  );

  it('accepts values with surrounding whitespace produced by legacy writers', () => {
    expect(decryptNumber(encrypt(' 42 '))).toBe(42);
  });
});
