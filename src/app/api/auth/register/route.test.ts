const register = jest.fn();

jest.mock('@/services/auth.service', () => ({ register }));

import { POST } from './route';

const PUBLIC_USER_ID = '3d594650-3436-4aa2-bb39-9fc9f5bc521d';

describe('POST /api/auth/register', () => {
  beforeEach(() => register.mockReset());

  it('keeps unexpected registration failures private', async () => {
    register.mockRejectedValue(new Error('database password leaked'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await POST(new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'person@example.com', password: ['valid', 'pass', '123'].join('-') }),
    }) as never);

    expect(response.status).toBe(500);
    expect(errorSpy).toHaveBeenCalledWith('auth_register_failed');
    expect(errorSpy).not.toHaveBeenCalledWith(expect.anything(), expect.any(Error));
    errorSpy.mockRestore();
  });

  it('returns the public UUID for a newly registered user', async () => {
    register.mockResolvedValue({
      success: true,
      user: {
        id: PUBLIC_USER_ID,
        email: 'owner@example.com',
        created_at: new Date('2026-07-22T00:00:00.000Z'),
      },
    });

    const response = await POST(new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@example.com',
        password: 'StrongPass123!',
      }),
    }) as never);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.responseDetails).toEqual(expect.objectContaining({
      id: PUBLIC_USER_ID,
      email: 'owner@example.com',
    }));
    expect(body.responseDetails.id).not.toMatch(/^\d+$/);
  });

  it('rejects an over-limit password without invoking registration', async () => {
    const response = await POST(new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@example.com',
        password: 'a'.repeat(73),
      }),
    }) as never);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      responseCode: 400,
      responseStatus: 'ERROR',
      responseMessage: 'Validation failed',
      responseDetails: { errors: ['Password must be 72 UTF-8 bytes or fewer'] },
    });
    expect(register).not.toHaveBeenCalled();
  });
});
