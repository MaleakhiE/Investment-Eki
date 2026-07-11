export interface ParsedReceipt {
  amount: number | null;
  date: string | null;
  merchant: string | null;
  categoryGuess: string;
}

const AMOUNT_KEYWORD = /\b(total(?:\s+bayar)?|jumlah|bayar)\b/i;
const RECEIPT_METADATA = /\b(tanggal|date|waktu|time|kasir|cashier|struk|receipt|invoice|subtotal|total|jumlah|bayar|tunai|kembali|change|pajak|tax)\b/i;

const INDONESIAN_MONTHS: Record<string, number> = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};

function parseAmountToken(token: string): number | null {
  const cleaned = token.replace(/[^\d.,]/g, '');
  if (!/\d/.test(cleaned)) return null;

  const decimalMatch = cleaned.match(/([.,])(\d{2})$/);
  const hasEarlierSeparator = decimalMatch
    ? cleaned.slice(0, -decimalMatch[0].length).includes('.')
      || cleaned.slice(0, -decimalMatch[0].length).includes(',')
    : false;

  const integerPart = decimalMatch && (hasEarlierSeparator || cleaned.split(decimalMatch[1]).length === 2)
    ? cleaned.slice(0, -decimalMatch[0].length)
    : cleaned;
  const digits = integerPart.replace(/\D/g, '');
  if (!digits) return null;

  const value = Number(digits);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function extractAmount(text: string): number | null {
  const candidates = text
    .split(/\r?\n/)
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => AMOUNT_KEYWORD.test(line) && !/^\s*subtotal\b/i.test(line))
    .flatMap(({ line, index }) => {
      const keywordIndex = line.search(AMOUNT_KEYWORD);
      const afterKeyword = keywordIndex >= 0 ? line.slice(keywordIndex) : line;
      const tokens = afterKeyword.match(/(?:rp\s*)?\d[\d.,\s]*/gi) ?? [];
      return tokens.map((token) => ({
        value: parseAmountToken(token),
        score: (/total\s+bayar/i.test(line) ? 3 : /\btotal\b/i.test(line) ? 2 : 1) * 10 + index,
      }));
    })
    .filter((candidate): candidate is { value: number; score: number } => candidate.value !== null);

  if (candidates.length === 0) return null;
  candidates.sort((left, right) => right.score - left.score);
  return candidates[0].value;
}

function normalizeYear(year: number): number {
  if (year >= 100) return year;
  return year >= 70 ? 1900 + year : 2000 + year;
}

function toIsoDate(day: number, month: number, year: number): string | null {
  const normalizedYear = normalizeYear(year);
  const date = new Date(Date.UTC(normalizedYear, month - 1, day));
  if (
    date.getUTCFullYear() !== normalizedYear
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null;

  return `${normalizedYear.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export function extractDate(text: string): string | null {
  const numeric = text.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})\b/);
  if (numeric) return toIsoDate(Number(numeric[1]), Number(numeric[2]), Number(numeric[3]));

  const monthNames = Object.keys(INDONESIAN_MONTHS).join('|');
  const named = text.match(new RegExp(`\\b(\\d{1,2})\\s+(${monthNames})\\s+(\\d{2}|\\d{4})\\b`, 'i'));
  if (!named) return null;
  return toIsoDate(Number(named[1]), INDONESIAN_MONTHS[named[2].toLowerCase()], Number(named[3]));
}

export function extractMerchant(text: string): string | null {
  for (const rawLine of text.split(/\r?\n/).slice(0, 8)) {
    const line = rawLine
      .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (
      line.length < 2
      || !/\p{L}/u.test(line)
      || RECEIPT_METADATA.test(line)
      || /^(jl\.?|jalan|alamat|telp\.?|telepon)\b/i.test(line)
    ) continue;
    return line.slice(0, 100);
  }
  return null;
}

const CATEGORY_RULES: Array<[RegExp, string]> = [
  [/\b(indomaret|alfamart|supermarket|mart|grocery|pasar)\b/i, 'Living'],
  [/\b(kopi|coffee|cafe|resto|restaurant|warung|bakery|food)\b/i, 'Food'],
  [/\b(shell|pertamina|spbu|grab|gojek|taxi|parking|parkir|tol)\b/i, 'Transport'],
  [/\b(apotek|pharmacy|klinik|clinic|hospital|rumah sakit)\b/i, 'Health'],
  [/\b(pln|pdam|internet|telkom|utility)\b/i, 'Bills'],
];

export function guessCategory(merchant: string | null): string {
  if (!merchant) return 'Other';
  return CATEGORY_RULES.find(([pattern]) => pattern.test(merchant))?.[1] ?? 'Other';
}

export function parseReceiptText(text: string): ParsedReceipt {
  const merchant = extractMerchant(text);
  return {
    amount: extractAmount(text),
    date: extractDate(text),
    merchant,
    categoryGuess: guessCategory(merchant),
  };
}
