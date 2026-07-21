const auth = jest.fn();
const exportToJSON = jest.fn();
const exportToCSV = jest.fn();
const getExportSummary = jest.fn();

jest.mock('@/lib/auth', () => ({ auth }));
jest.mock('@/services/export.service', () => ({
  exportToJSON,
  exportToCSV,
  getExportSummary,
}));

import { GET } from './route';

const makeRequest = (query = '') => new Request(`http://localhost/api/export${query}`) as never;

beforeEach(() => {
  jest.clearAllMocks();
  auth.mockResolvedValue({ user: { id: '20' } });
  exportToJSON.mockResolvedValue({ transactions: [] });
  exportToCSV.mockReturnValue('"Date","Type","Category","Description","Amount"');
  getExportSummary.mockResolvedValue({ total_records: 0 });
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

  it('also prevents caching authentication and server errors', async () => {
    auth.mockResolvedValueOnce(null);
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
