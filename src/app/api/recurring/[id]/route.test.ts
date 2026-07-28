jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/services/recurring.service', () => {
  class RecurringInputError extends Error {}
  return {
    RecurringInputError,
    deleteRecurring: jest.fn(),
    getSafeRecurringErrorCode: (error: { code?: string }) => (
      ['P1001', 'P2002', 'P2025', 'P2034'].includes(error?.code ?? '')
        ? error.code
        : error instanceof TypeError ? 'TYPE_ERROR' : 'UNCLASSIFIED'
    ),
    updateRecurring: jest.fn(),
  };
});

import { getCurrentUserId } from '@/lib/auth';
import {
  deleteRecurring,
  RecurringInputError,
  updateRecurring,
} from '@/services/recurring.service';
import { DELETE, PATCH } from './route';

const userId = BigInt(7);
const params = (id = '5') => ({ params: Promise.resolve({ id }) });
const request = (body = '{}') => new Request('https://fintrack.example/api/recurring/5', {
  method: 'PATCH',
  headers: { 'content-type': 'application/json' },
  body,
}) as never;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getCurrentUserId).mockResolvedValue(userId);
});

afterEach(() => jest.restoreAllMocks());

describe('/api/recurring/[id] privacy', () => {
  it('returns exact private 401 responses without invoking mutation services', async () => {
    jest.mocked(getCurrentUserId).mockResolvedValue(null);
    const then = jest.fn(() => {
      throw new Error('private params must not be awaited');
    });
    const untouchedParams = { params: { then } as never };

    const patchResponse = await PATCH(request('{invalid private json'), untouchedParams);
    const deleteResponse = await DELETE(request(), untouchedParams);

    for (const response of [patchResponse, deleteResponse]) {
      expect(response.status).toBe(401);
      expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
      await expect(response.json()).resolves.toEqual({
        responseCode: 401,
        responseStatus: 'ERROR',
        responseMessage: 'Unauthorized',
        responseDetails: null,
      });
    }
    expect(then).not.toHaveBeenCalled();
    expect(updateRecurring).not.toHaveBeenCalled();
    expect(deleteRecurring).not.toHaveBeenCalled();
  });

  it('updates an owned rule with the exact private response', async () => {
    jest.mocked(updateRecurring).mockResolvedValue(true);
    const body = { amount: 500_000, is_active: false };

    const response = await PATCH(request(JSON.stringify(body)), params());

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    await expect(response.json()).resolves.toEqual({
      responseCode: 200,
      responseStatus: 'SUCCESS',
      responseMessage: 'Recurring transaction updated',
      responseDetails: null,
    });
    expect(updateRecurring).toHaveBeenCalledWith(userId, BigInt(5), body);
  });

  it('keeps missing and foreign updates indistinguishable and private', async () => {
    jest.mocked(updateRecurring).mockResolvedValue(false);

    const response = await PATCH(request(), params());

    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    await expect(response.json()).resolves.toEqual({
      responseCode: 404,
      responseStatus: 'ERROR',
      responseMessage: 'Recurring transaction not found',
      responseDetails: null,
    });
  });

  it('keeps update validation failures private and unlogged', async () => {
    jest.mocked(updateRecurring).mockRejectedValue(
      new RecurringInputError('Invalid start date. Use YYYY-MM-DD'),
    );
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await PATCH(request(JSON.stringify({ start_date: null })), params());

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    await expect(response.json()).resolves.toEqual({
      responseCode: 400,
      responseStatus: 'ERROR',
      responseMessage: 'Invalid start date. Use YYYY-MM-DD',
      responseDetails: null,
    });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('returns a generic private update failure and logs only a safe code', async () => {
    const rawError = Object.assign(
      new Error('Rule 5 Housing enc:2500000 failed for user 7'),
      { code: 'P2034', meta: { accountId: BigInt(2) } },
    );
    jest.mocked(updateRecurring).mockRejectedValue(rawError);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await PATCH(request(), params());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(body.responseMessage).toBe('Internal server error');
    expect(consoleError).toHaveBeenCalledWith('Recurring update failed', { code: 'P2034' });
    expect(JSON.stringify(consoleError.mock.calls))
      .not.toMatch(/Rule 5|Housing|2500000|user 7|accountId/);
  });

  it.each([
    '', '0', '00', '01', '+1', '-1', ' 1', '1 ', '1.0', '1e3', '0x1',
    '１２', '9223372036854775808', '12345678901234567890', 'secret-rule-id',
  ])('rejects invalid rule ID %p before parsing or mutating', async (id) => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const json = jest.fn().mockRejectedValue(new Error('private body must not be read'));
    const invalidRequest = { json } as never;

    const patchResponse = await PATCH(invalidRequest, params(id));
    const deleteResponse = await DELETE(request(), params(id));

    for (const response of [patchResponse, deleteResponse]) {
      expect(response.status).toBe(400);
      expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
      await expect(response.json()).resolves.toEqual({
        responseCode: 400,
        responseStatus: 'ERROR',
        responseMessage: 'Validation failed',
        responseDetails: { errors: ['Invalid recurring ID'] },
      });
    }
    expect(json).not.toHaveBeenCalled();
    expect(updateRecurring).not.toHaveBeenCalled();
    expect(deleteRecurring).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it.each(['{invalid', 'null', '[]', '"private"', '42', 'true'])(
    'rejects malformed or non-object PATCH JSON %s without mutating',
    async (body) => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      const response = await PATCH(request(body), params());

      expect(response.status).toBe(400);
      expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
      await expect(response.json()).resolves.toEqual({
        responseCode: 400,
        responseStatus: 'ERROR',
        responseMessage: 'Validation failed',
        responseDetails: { errors: ['Invalid JSON body'] },
      });
      expect(updateRecurring).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
    },
  );

  it('passes signed BIGINT boundary IDs to the scoped services', async () => {
    jest.mocked(updateRecurring).mockResolvedValue(true);
    jest.mocked(deleteRecurring).mockResolvedValue(undefined);
    const maximum = '9223372036854775807';

    const patchResponse = await PATCH(request(), params(maximum));
    const deleteResponse = await DELETE(request(), params('1'));

    expect(patchResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(200);
    expect(updateRecurring).toHaveBeenCalledWith(userId, BigInt(maximum), {});
    expect(deleteRecurring).toHaveBeenCalledWith(userId, BigInt(1));
  });

  it('deletes an owned or missing rule with the existing private idempotent response', async () => {
    jest.mocked(deleteRecurring).mockResolvedValue(undefined);

    const response = await DELETE(request(), params());

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    await expect(response.json()).resolves.toEqual({
      responseCode: 200,
      responseStatus: 'SUCCESS',
      responseMessage: 'Recurring transaction deleted',
      responseDetails: null,
    });
    expect(deleteRecurring).toHaveBeenCalledWith(userId, BigInt(5));
  });

  it('returns a generic private delete failure and logs only a safe code', async () => {
    const rawError = Object.assign(
      new Error('Delete rule 5 for user 7 at mysql://private-host'),
      { code: 'P2025', meta: { category: 'Housing' } },
    );
    jest.mocked(deleteRecurring).mockRejectedValue(rawError);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await DELETE(request(), params());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(body.responseMessage).toBe('Internal server error');
    expect(consoleError).toHaveBeenCalledWith('Recurring delete failed', { code: 'P2025' });
    expect(JSON.stringify(consoleError.mock.calls))
      .not.toMatch(/rule 5|user 7|private-host|Housing/);
  });
});
