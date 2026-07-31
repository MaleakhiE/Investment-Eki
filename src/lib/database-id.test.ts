import { parseDatabaseId } from './database-id';

describe('database ID parsing', () => {
  it.each([
    ['1', BigInt(1)],
    ['9223372036854775807', BigInt('9223372036854775807')],
  ])('accepts canonical signed BIGINT ID %s', (input, expected) => {
    expect(parseDatabaseId(input)).toBe(expected);
  });

  it.each([
    '', '0', '00', '01', '+1', '-1', ' 1', '1 ', '1.0', '1e3', '0x1',
    '１２', '9223372036854775808', '12345678901234567890', 'private-id',
  ])('rejects noncanonical database ID %p', (input) => {
    expect(parseDatabaseId(input)).toBeNull();
  });
});
