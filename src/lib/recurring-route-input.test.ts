import { isJsonObject, parseRecurringId } from './recurring-route-input';

describe('recurring route input structure', () => {
  it.each([
    ['1', BigInt(1)],
    ['9223372036854775807', BigInt('9223372036854775807')],
  ])('accepts canonical signed BIGINT ID %s', (input, expected) => {
    expect(parseRecurringId(input)).toBe(expected);
  });

  it.each([
    '', '0', '00', '01', '+1', '-1', ' 1', '1 ', '1.0', '1e3', '0x1',
    '１２', '9223372036854775808', '12345678901234567890', 'private-rule',
  ])('rejects noncanonical recurring ID %p', (input) => {
    expect(parseRecurringId(input)).toBeNull();
  });

  it.each([{}, { action: 'process' }])('accepts JSON object %p', (input) => {
    expect(isJsonObject(input)).toBe(true);
  });

  it.each([null, [], [{}], 'private', 42, true])('rejects non-object JSON %p', (input) => {
    expect(isJsonObject(input)).toBe(false);
  });
});
