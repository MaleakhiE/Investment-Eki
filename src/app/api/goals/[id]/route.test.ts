const getCurrentUserId = jest.fn();
const updateGoal = jest.fn();
const addToGoal = jest.fn();
const deleteGoal = jest.fn();

jest.mock('@/lib/auth', () => ({ getCurrentUserId }));
jest.mock('@/services/goals.service', () => {
  class InvalidGoalAmountError extends Error {}
  return { InvalidGoalAmountError, updateGoal, addToGoal, deleteGoal };
});

import { InvalidGoalAmountError } from '@/services/goals.service';
import { PATCH } from './route';

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const request = (body: unknown) => new Request('http://localhost/api/goals/30', {
  method: 'PATCH',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
}) as never;

beforeEach(() => {
  jest.clearAllMocks();
  getCurrentUserId.mockResolvedValue(BigInt(20));
});

describe('PATCH /api/goals/[id]', () => {
  it('authenticates before parsing input or invoking a goal service', async () => {
    getCurrentUserId.mockResolvedValueOnce(null);

    const response = await PATCH(request({ add_amount: 25 }), params('invalid'));

    expect(response.status).toBe(401);
    expect(addToGoal).not.toHaveBeenCalled();
    expect(updateGoal).not.toHaveBeenCalled();
  });

  it.each(['invalid', '0', '-1', '9223372036854775808'])(
    'rejects invalid goal ID %s',
    async (id) => {
      const response = await PATCH(request({ add_amount: 25 }), params(id));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        responseCode: 400,
        responseStatus: 'ERROR',
        responseMessage: 'Validation failed',
        responseDetails: { errors: ['Invalid goal ID'] },
      });
      expect(addToGoal).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['numeric string', '25'],
    ['null', null],
    ['zero', 0],
    ['negative', -1],
  ])('rejects a %s addition before invoking the service', async (_case, addAmount) => {
    const response = await PATCH(request({ add_amount: addAmount }), params('30'));

    expect(response.status).toBe(400);
    expect((await response.json()).responseDetails).toEqual({
      errors: ['add_amount must be a finite positive number'],
    });
    expect(addToGoal).not.toHaveBeenCalled();
  });

  it('rejects malformed or non-object JSON bodies', async () => {
    const malformed = new Request('http://localhost/api/goals/30', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: '{',
    }) as never;

    const malformedResponse = await PATCH(malformed, params('30'));
    const primitiveResponse = await PATCH(request(null), params('30'));

    expect(malformedResponse.status).toBe(400);
    expect(primitiveResponse.status).toBe(400);
    expect(addToGoal).not.toHaveBeenCalled();
    expect(updateGoal).not.toHaveBeenCalled();
  });

  it('passes a finite positive addition through the internal identity boundary', async () => {
    addToGoal.mockResolvedValueOnce({ id: '30', current_amount: 125 });

    const response = await PATCH(request({ add_amount: 25 }), params('30'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(addToGoal).toHaveBeenCalledWith(BigInt(20), BigInt(30), 25);
    expect(body).toEqual({
      responseCode: 200,
      responseStatus: 'SUCCESS',
      responseMessage: 'Amount added to goal',
      responseDetails: { id: '30', current_amount: 125 },
    });
  });

  it('keeps missing and foreign goals indistinguishable', async () => {
    addToGoal.mockResolvedValueOnce(null);

    const response = await PATCH(request({ add_amount: 25 }), params('30'));

    expect(response.status).toBe(404);
    expect((await response.json()).responseMessage).toBe('Goal not found');
  });

  it('maps a non-finite resulting balance to validation without leaking state', async () => {
    addToGoal.mockRejectedValueOnce(new InvalidGoalAmountError());
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await PATCH(request({ add_amount: 25 }), params('30'));

    expect(response.status).toBe(400);
    expect((await response.json()).responseDetails).toEqual({
      errors: ['add_amount produces an invalid goal balance'],
    });
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('preserves ordinary goal updates', async () => {
    updateGoal.mockResolvedValueOnce({ id: '30', name: 'Updated' });

    const response = await PATCH(request({ name: 'Updated' }), params('30'));

    expect(response.status).toBe(200);
    expect(updateGoal).toHaveBeenCalledWith(BigInt(20), BigInt(30), { name: 'Updated' });
    expect(addToGoal).not.toHaveBeenCalled();
  });

  it('keeps unexpected failures private', async () => {
    addToGoal.mockRejectedValueOnce(new Error('ciphertext:secret'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await PATCH(request({ add_amount: 25 }), params('30'));

    expect(response.status).toBe(500);
    expect((await response.json()).responseDetails).toBeNull();
    expect(consoleError).toHaveBeenCalledWith(
      'Update goal error:',
      { code: 'UNCLASSIFIED' },
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('ciphertext:secret');
    consoleError.mockRestore();
  });
});
