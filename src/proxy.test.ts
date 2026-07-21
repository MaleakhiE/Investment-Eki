const auth = jest.fn();

jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({ auth })),
}));

import { config, proxy } from './proxy';

describe('Next.js proxy', () => {
  it('passes the incoming request through the NextAuth boundary', async () => {
    const request = new Request('http://localhost/dashboard');
    const expected = new Response(null, { status: 204 });
    auth.mockResolvedValue(expected);

    await expect(proxy(request as never)).resolves.toBe(expected);
    expect(auth).toHaveBeenCalledWith(request);
  });

  it('retains the application route matcher', () => {
    expect(config.matcher).toEqual([
      '/((?!_next/static|_next/image|favicon.ico|public/|api/auth|api/health).*)',
    ]);
  });
});
