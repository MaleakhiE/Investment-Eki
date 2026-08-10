import { parseCalendarDate } from '@/lib/financial-input';
import { isFinitePositiveAmount } from '@/lib/financial-input';
import { type TransactionInput, type TransactionType } from './transaction.service';

export const MAX_IMPORT_BYTES = 1_000_000;
export const MAX_IMPORT_ROWS = 1_000;

export interface TransactionImportRow {
  rowNumber: number;
  input: TransactionInput | null;
  errors: string[];
  duplicateOf: number | null;
}

export interface TransactionImportPreview {
  rows: TransactionImportRow[];
  validRows: number;
  invalidRows: number;
  duplicateRows: number[];
}

const REQUIRED_HEADERS = ['date', 'type', 'category', 'description', 'amount'] as const;

function splitCsvLine(line: string): string[] | null {
  const values: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }

  if (quoted) return null;
  values.push(value.trim());
  return values;
}

function parseAmount(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const amount = Number(value);
  return isFinitePositiveAmount(amount) ? amount : null;
}

function fingerprint(input: TransactionInput): string {
  return [input.date, input.type, input.category.trim().toLowerCase(), input.description.trim().toLowerCase(), input.amount, input.account?.trim().toLowerCase() ?? ''].join('|');
}

export function previewTransactionCsv(csv: string): TransactionImportPreview | { errors: string[] } {
  if (typeof csv !== 'string' || Buffer.byteLength(csv, 'utf8') > MAX_IMPORT_BYTES) {
    return { errors: [`CSV input must be smaller than ${MAX_IMPORT_BYTES} bytes`] };
  }

  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length < 2) return { errors: ['CSV must include a header and at least one transaction row'] };
  if (lines.length - 1 > MAX_IMPORT_ROWS) return { errors: [`CSV cannot contain more than ${MAX_IMPORT_ROWS} transaction rows`] };

  const header = splitCsvLine(lines[0]);
  if (!header) return { errors: ['CSV header contains an unterminated quoted value'] };
  const headers = header.map((value) => value.toLowerCase());
  const missing = REQUIRED_HEADERS.filter((name) => !headers.includes(name));
  if (missing.length > 0) return { errors: [`CSV is missing required columns: ${missing.join(', ')}`] };

  const firstRowByFingerprint = new Map<string, number>();
  const rows = lines.slice(1).map((line, index): TransactionImportRow => {
    const rowNumber = index + 2;
    const values = splitCsvLine(line);
    if (!values) return { rowNumber, input: null, errors: ['Unterminated quoted value'], duplicateOf: null };
    const valueFor = (name: string) => values[headers.indexOf(name)] ?? '';
    const errors: string[] = [];
    const date = valueFor('date');
    const type = valueFor('type').toUpperCase();
    const category = valueFor('category');
    const description = valueFor('description');
    const amount = parseAmount(valueFor('amount'));
    if (!parseCalendarDate(date)) errors.push('date must use a valid YYYY-MM-DD value');
    if (!['INCOME', 'EXPENSE'].includes(type)) errors.push('type must be INCOME or EXPENSE');
    if (!category.trim()) errors.push('category is required');
    if (!description.trim()) errors.push('description is required');
    if (amount === null) errors.push('amount must be a positive number with at most two decimals');

    const input = errors.length === 0 ? {
      date,
      type: type as TransactionType,
      category,
      description,
      amount: amount as number,
      account: valueFor('account') || null,
    } : null;
    const duplicateOf = input ? firstRowByFingerprint.get(fingerprint(input)) ?? null : null;
    if (input && duplicateOf === null) firstRowByFingerprint.set(fingerprint(input), rowNumber);
    return { rowNumber, input, errors, duplicateOf };
  });

  const duplicateRows = rows.filter((row) => row.duplicateOf !== null).map((row) => row.rowNumber);
  return {
    rows,
    validRows: rows.filter((row) => row.input !== null && row.errors.length === 0).length,
    invalidRows: rows.filter((row) => row.input === null || row.errors.length > 0).length,
    duplicateRows,
  };
}
