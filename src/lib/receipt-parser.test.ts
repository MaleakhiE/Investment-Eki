import fc from 'fast-check';

import {
  extractAmount,
  extractDate,
  extractMerchant,
  guessCategory,
  parseReceiptText,
} from './receipt-parser';

describe('receipt parser', () => {
  test.each([
    ['TOTAL Rp 125.000', 125_000],
    ['Jumlah: 48,500.00', 48_500],
    ['SUBTOTAL 20.000\nTOTAL BAYAR 22.000', 22_000],
    ['Bayar\tRp 9.750,00', 9_750],
  ])('extracts Indonesian receipt amount from %p', (text, expected) => {
    expect(extractAmount(text)).toBe(expected);
  });

  it('does not mistake a date for an amount when no total keyword exists', () => {
    expect(extractAmount('Tanggal 11/07/2026')).toBeNull();
  });

  test.each([
    ['Tanggal: 11/07/2026', '2026-07-11'],
    ['11-7-26 18:30', '2026-07-11'],
    ['11 Juli 2026', '2026-07-11'],
  ])('normalizes receipt date from %p', (text, expected) => {
    expect(extractDate(text)).toBe(expected);
  });

  it('rejects impossible calendar dates', () => {
    expect(extractDate('31/02/2026')).toBeNull();
  });

  it('uses the first meaningful non-metadata line as merchant', () => {
    expect(extractMerchant('*** TOKO MAJU ***\nJl. Merdeka 10\nTanggal 11/07/2026\nTOTAL 25.000'))
      .toBe('TOKO MAJU');
  });

  test.each([
    ['Indomaret Fresh', 'Living'],
    ['Kopi Kenangan', 'Food'],
    ['Shell SPBU', 'Transport'],
    ['Apotek Sehat', 'Health'],
    ['PLN Mobile', 'Bills'],
    ['Unknown Merchant', 'Other'],
  ])('guesses category for %p', (merchant, expected) => {
    expect(guessCategory(merchant)).toBe(expected);
  });

  it('only returns categories accepted by the transaction form', () => {
    const accepted = ['Rent', 'Living', 'Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Health', 'Education', 'Investment', 'Other'];
    for (const merchant of ['Indomaret', 'Kopi', 'Shell', 'Apotek', 'PLN', 'Unknown']) {
      expect(accepted).toContain(guessCategory(merchant));
    }
  });

  it('returns one structured review-only parse result', () => {
    expect(parseReceiptText('TOKO MAJU\nTanggal 11/07/2026\nTOTAL Rp 125.000')).toEqual({
      amount: 125_000,
      date: '2026-07-11',
      merchant: 'TOKO MAJU',
      categoryGuess: 'Other',
    });
  });

  it('extracts any positive integer formatted with Indonesian thousand separators', () => {
    fc.assert(fc.property(fc.integer({ min: 1_000, max: 999_999_999 }), (amount) => {
      const formatted = new Intl.NumberFormat('id-ID').format(amount);
      expect(extractAmount(`TOKO UJI\nTOTAL Rp ${formatted}`)).toBe(amount);
    }), { numRuns: 150 });
  });
});
