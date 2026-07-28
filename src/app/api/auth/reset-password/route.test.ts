const resetPassword = jest.fn();

jest.mock('@/services/password-reset.service', () => ({ resetPassword }));

import { POST } from './route';

const request = (password: string) => new Request(
  'http://localhost/api/auth/reset-password',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: 'reset-token', password }),
  },
) as never;

beforeEach(() => jest.clearAllMocks());

describe('POST /api/auth/reset-password', () => {
  it('rejects an over-limit password before invoking reset persistence', async () => {
    const response = await POST(request('a'.repeat(73)));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      responseCode: 400,
      responseStatus: 'ERROR',
      responseMessage: 'Validation failed',
      responseDetails: { errors: ['Password must be 72 UTF-8 bytes or fewer'] },
    });
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('preserves the existing reset contract at the inclusive boundary', async () => {
    resetPassword.mockResolvedValueOnce({ success: true });

    const response = await POST(request('a'.repeat(72)));

    expect(response.status).toBe(200);
    expect(resetPassword).toHaveBeenCalledWith('reset-token', 'a'.repeat(72));
    expect((await response.json()).responseMessage).toBe('Password reset successfully');
  });
});
