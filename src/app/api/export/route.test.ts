const getCurrentUserId = jest.fn();
const exportToJSON = jest.fn();
const exportTransactions = jest.fn();
const exportToCSV = jest.fn();
const getExportSummary = jest.fn();

jest.mock('@/lib/auth', () => ({ getCurrentUserId }));
jest.mock('@/services/export.service', () => {
  class ExportAccountNotFoundError extends Error {
    constructor(message?: string) {
      super(message);
    }
  }
  return {
    ExportAccountNotFoundError,
    exportToJSON,
    exportTransactions,
    exportToCSV,
    getExportSummary,
  };
});

import { ExportAccountNotFoundError } from '@/services/export.service';
import { GET } from './route';

const makeRequest = (query = '') => new Request(`http://localhost/api/export${query}`) as never;

beforeEach(() => {
  jest.clearAllMocks();
  getCurrentUserId.mockResolvedValue(BigInt(20));
  exportToJSON.mockResolvedValue({ transactions: [] });
  exportTransactions.mockResolvedValue([]);
  exportToCSV.mockReturnValue('"Date"');
  getExportSummary.mockResolvedValue({ total_records: 0, account_options: [] });
});

describe('GET /api/export', () => {
  it.each([
    ['JSON export', ''],
    ['CSV export', '?format=csv'],
    ['summary', '?summary=true'],
  ])('marks the %s response private and non-cacheable', async (_label, query) => {
    const response = await GET(makeRequest(query));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
  });

  it('passes strict inclusive account/date filters only to the CSV transaction export', async () => {
    const response = await GET(makeRequest(
      '?format=csv&from=2026-07-01&to=2026-07-31&accountId=2',
    ));

    expect(response.status).toBe(200);
    expect(exportTransactions).toHaveBeenCalledWith(BigInt(20), {
      from: new Date('2026-07-01T00:00:00.000Z'),
      to: new Date('2026-07-31T00:00:00.000Z'),
      accountId: BigInt(2),
    });
    expect(exportToJSON).not.toHaveBeenCalled();
    expect(response.headers.get('content-disposition')).toContain('transactions_');
  });

  it.each([
    ['?format=xml', 'format must be json or csv'],
    ['?format=csv&from=2026-7-01', 'from must be a valid YYYY-MM-DD date'],
    ['?format=csv&from=0000-01-01', 'from must be a valid YYYY-MM-DD date'],
    ['?format=csv&to=2026-02-30', 'to must be a valid YYYY-MM-DD date'],
    ['?format=csv&from=2026-08-01&to=2026-07-31', 'from must be on or before to'],
    ['?format=csv&accountId=0', 'accountId must be a positive integer'],
    ['?format=csv&accountId=abc', 'accountId must be a positive integer'],
    ['?format=csv&accountId=9223372036854775808', 'accountId must be a positive integer'],
    ['?format=json&from=2026-07-01', 'filters are supported for CSV exports only'],
    ['?summary=true&format=csv&accountId=2', 'filters are not supported for export summaries'],
  ])('returns a standard private validation error for %s', async (query, error) => {
    const response = await GET(makeRequest(query));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(body).toEqual({
      responseCode: 400,
      responseStatus: 'ERROR',
      responseMessage: 'Validation failed',
      responseDetails: { errors: [error] },
    });
    expect(exportToJSON).not.toHaveBeenCalled();
    expect(exportTransactions).not.toHaveBeenCalled();
  });

  it('returns the same private not-found response for a missing or foreign account', async () => {
    exportTransactions.mockRejectedValueOnce(new ExportAccountNotFoundError());

    const response = await GET(makeRequest('?format=csv&accountId=404'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(body.responseMessage).toBe('Account not found');
  });

  it('uses data-export rather than backup filename semantics for JSON', async () => {
    const response = await GET(makeRequest());

    expect(response.headers.get('content-disposition')).toMatch(
      /^attachment; filename="fintrack_data_export_\d{4}-\d{2}-\d{2}\.json"$/,
    );
  });

  it('also prevents caching authentication and unexpected server errors', async () => {
    getCurrentUserId.mockResolvedValueOnce(null);
    const unauthorized = await GET(makeRequest());

    exportToJSON.mockRejectedValueOnce(new Error('database unavailable'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const failed = await GET(makeRequest());

    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(failed.status).toBe(500);
    expect(failed.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    consoleError.mockRestore();
  });
});
