jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    applicationSmtpSettings: { findUnique: jest.fn() },
  },
}));

import { prisma } from '@/lib/prisma';
import { GET } from './route';

const queryDatabase = jest.mocked(prisma.$queryRaw);
const findSmtpSettings = jest.mocked(prisma.applicationSmtpSettings.findUnique);

describe('GET /api/health/ready', () => {
  let errorLog: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    jest.clearAllMocks();
    errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => errorLog.mockRestore());

  it('reports ready when the database responds and global SMTP is configured', async () => {
    queryDatabase.mockResolvedValue([{ ok: 1 }]);
    findSmtpSettings.mockResolvedValue({ id: 1 } as never);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      responseCode: 200,
      responseStatus: 'SUCCESS',
      responseMessage: 'Ready',
      responseDetails: { status: 'ok' },
    });
    expect(findSmtpSettings).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { id: true },
    });
  });

  it('fails closed without leaking dependency details when SMTP is not configured', async () => {
    queryDatabase.mockResolvedValue([{ ok: 1 }]);
    findSmtpSettings.mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      responseCode: 503,
      responseStatus: 'ERROR',
      responseMessage: 'Service unavailable',
      responseDetails: { status: 'unavailable' },
    });
    expect(JSON.stringify(body)).not.toMatch(/smtp|database|credential|password/i);
    expect(errorLog).toHaveBeenCalledWith('Readiness dependency check failed');
  });

  it('fails closed without leaking dependency details when the database check throws', async () => {
    queryDatabase.mockRejectedValue(new Error('mysql://user:secret@internal-db/finance'));
    findSmtpSettings.mockResolvedValue({ id: 1 } as never);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.responseMessage).toBe('Service unavailable');
    expect(JSON.stringify(body)).not.toMatch(/mysql|secret|internal-db/i);
    expect(errorLog).toHaveBeenCalledWith('Readiness dependency check failed');
  });
});
