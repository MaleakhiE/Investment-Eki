jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/services/recurring.service', () => {
  class RecurringInputError extends Error {}
  return {
    RecurringInputError,
    createRecurring: jest.fn(),
    getRecurrings: jest.fn(),
    getSafeRecurringErrorCode: (error: { code?: string }) => (
      ['P1001', 'P2002', 'P2025', 'P2034'].includes(error?.code ?? '')
        ? error.code
        : error instanceof TypeError ? 'TYPE_ERROR' : 'UNCLASSIFIED'
    ),
    processRecurrings: jest.fn(),
  };
});

import { getCurrentUserId } from '@/lib/auth';
import {
  createRecurring,
  getRecurrings,
  processRecurrings,
  RecurringInputError,
} from '@/services/recurring.service';
import { GET, POST } from './route';

const userId = BigInt(7);
const recurring = {
  id: '5',
  type: 'EXPENSE',
  category: 'Housing',
  description: 'Rent',
  amount: 2_500_000,
  frequency: 'MONTHLY',
  day_of_month: 31,
  day_of_week: null,
  month_of_year: null,
  account_id: '2',
  start_date: '2026-01-01',
  end_date: null,
  is_active: true,
  last_run: null,
  next_run: '2026-07-31',
};
const request = (body: string) => new Request('https://fintrack.example/api/recurring', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body,
}) as never;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getCurrentUserId).mockResolvedValue(userId);
});

afterEach(() => jest.restoreAllMocks());

describe('/api/recurring privacy', () => {
  it('returns exact private 401 responses before reading or processing input', async () => {
    jest.mocked(getCurrentUserId).mockResolvedValue(null);

    const getResponse = await GET();
    const postResponse = await POST(request('{invalid private json'));

    for (const response of [getResponse, postResponse]) {
      expect(response.status).toBe(401);
      expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
      await expect(response.json()).resolves.toEqual({
        responseCode: 401,
        responseStatus: 'ERROR',
        responseMessage: 'Unauthorized',
        responseDetails: null,
      });
    }
    expect(getRecurrings).not.toHaveBeenCalled();
    expect(createRecurring).not.toHaveBeenCalled();
    expect(processRecurrings).not.toHaveBeenCalled();
  });

  it('returns the owner recurring list unchanged and private', async () => {
    jest.mocked(getRecurrings).mockResolvedValue([recurring] as never);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toEqual({
      responseCode: 200,
      responseStatus: 'SUCCESS',
      responseMessage: 'Recurring transactions retrieved',
      responseDetails: [recurring],
    });
    expect(getRecurrings).toHaveBeenCalledWith(userId);
  });

  it('returns a generic private GET failure and logs only a safe code', async () => {
    const rawError = Object.assign(
      new Error('User 7 Housing enc:2500000 mysql://private-host'),
      { code: 'P1001', meta: { ruleId: BigInt(5) } },
    );
    jest.mocked(getRecurrings).mockRejectedValue(rawError);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(body).toEqual({
      responseCode: 500,
      responseStatus: 'ERROR',
      responseMessage: 'Internal server error',
      responseDetails: null,
    });
    expect(consoleError).toHaveBeenCalledWith('Recurring list failed', { code: 'P1001' });
    expect(JSON.stringify(consoleError.mock.calls)).not.toMatch(/User 7|Housing|2500000|private-host|ruleId/);
  });

  it('preserves the signed-in manual processing response and categories', async () => {
    jest.mocked(processRecurrings).mockResolvedValue(['Housing']);

    const response = await POST(request(JSON.stringify({ action: 'process' })));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    await expect(response.json()).resolves.toEqual({
      responseCode: 200,
      responseStatus: 'SUCCESS',
      responseMessage: 'Processed 1 recurring transactions',
      responseDetails: { created: ['Housing'] },
    });
    expect(processRecurrings).toHaveBeenCalledWith(userId);
    expect(createRecurring).not.toHaveBeenCalled();
  });

  it('returns the exact private missing-fields response without mutating', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await POST(request(JSON.stringify({ type: 'EXPENSE' })));

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    await expect(response.json()).resolves.toEqual({
      responseCode: 400,
      responseStatus: 'ERROR',
      responseMessage: 'Missing required fields',
      responseDetails: null,
    });
    expect(createRecurring).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('creates a recurring rule with the exact private response and service mapping', async () => {
    jest.mocked(createRecurring).mockResolvedValue(recurring as never);
    const input = {
      type: 'EXPENSE',
      category: 'Housing',
      description: 'Rent',
      amount: 2_500_000,
      frequency: 'MONTHLY',
      day_of_month: 31,
      account_id: '2',
      start_date: '2026-01-01',
      end_date: '',
    };

    const response = await POST(request(JSON.stringify(input)));

    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    await expect(response.json()).resolves.toEqual({
      responseCode: 201,
      responseStatus: 'SUCCESS',
      responseMessage: 'Recurring transaction created',
      responseDetails: recurring,
    });
    expect(createRecurring).toHaveBeenCalledWith(userId, expect.objectContaining(input));
  });

  it('keeps recurring validation failures private and unlogged', async () => {
    jest.mocked(createRecurring).mockRejectedValue(
      new RecurringInputError('Amount must be a positive number'),
    );
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await POST(request(JSON.stringify({
      type: 'EXPENSE',
      category: 'Housing',
      amount: -1,
      frequency: 'MONTHLY',
      start_date: '2026-01-01',
    })));

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    await expect(response.json()).resolves.toEqual({
      responseCode: 400,
      responseStatus: 'ERROR',
      responseMessage: 'Amount must be a positive number',
      responseDetails: null,
    });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('returns a generic private POST failure and logs no submitted details', async () => {
    const rawError = Object.assign(
      new Error('Housing Rent amount 2500000 for user 7 at mysql://private-host'),
      { code: 'ARBITRARY_PRIVATE_CODE', meta: { accountId: BigInt(2) } },
    );
    jest.mocked(createRecurring).mockRejectedValue(rawError);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await POST(request(JSON.stringify({
      type: 'EXPENSE',
      category: 'Housing',
      description: 'Rent',
      amount: 2_500_000,
      frequency: 'MONTHLY',
      start_date: '2026-01-01',
    })));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(body.responseMessage).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain(rawError.message);
    expect(consoleError).toHaveBeenCalledWith(
      'Recurring create or process failed',
      { code: 'UNCLASSIFIED' },
    );
    expect(JSON.stringify(consoleError.mock.calls))
      .not.toMatch(/Housing|Rent|2500000|user 7|private-host|accountId/);
  });

  it('keeps malformed authenticated JSON private and out of logs', async () => {
    const sensitiveBody = '{"category":"Private Housing","amount":2500000';
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await POST(request(sensitiveBody));

    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    await expect(response.json()).resolves.toEqual({
      responseCode: 500,
      responseStatus: 'ERROR',
      responseMessage: 'Internal server error',
      responseDetails: null,
    });
    expect(createRecurring).not.toHaveBeenCalled();
    expect(processRecurrings).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      'Recurring create or process failed',
      { code: 'UNCLASSIFIED' },
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toMatch(/Private Housing|2500000/);
  });
});
