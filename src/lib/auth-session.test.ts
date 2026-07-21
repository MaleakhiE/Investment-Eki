const user = { findUnique: jest.fn() };
jest.mock('@/lib/prisma', () => ({ prisma: { user } }));

import { isSessionVersionCurrent } from './auth-session';

describe('session version validation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('accepts a token only while its version matches the user record', async () => {
    user.findUnique.mockResolvedValue({ session_version: 3 });
    await expect(isSessionVersionCurrent('7', 3)).resolves.toBe(true);
    await expect(isSessionVersionCurrent('7', 2)).resolves.toBe(false);
  });

  it.each([
    ['', 1],
    ['not-an-id', 1],
    ['7', undefined],
  ])('rejects malformed token identity/version %s %s', async (id, version) => {
    await expect(isSessionVersionCurrent(id, version)).resolves.toBe(false);
  });

  it('rejects a token for a deleted user', async () => {
    user.findUnique.mockResolvedValue(null);
    await expect(isSessionVersionCurrent('7', 1)).resolves.toBe(false);
  });
});
