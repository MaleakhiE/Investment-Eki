const userRepository = { findUnique: jest.fn(), create: jest.fn() };
const compare = jest.fn();

jest.mock('@/lib/prisma', () => ({ prisma: { user: userRepository } }));
jest.mock('@/lib/encryption', () => ({
  encryptDeterministic: (value: string) => `encrypted:${value}`,
  decrypt: (value: string) => value,
}));
jest.mock('bcrypt', () => ({
  __esModule: true,
  default: { hash: jest.fn(), compare },
}));

import { validateCredentials } from './auth.service';

describe('credential login for OAuth users', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not authenticate an OAuth-only account without a local password', async () => {
    userRepository.findUnique.mockResolvedValue({
      id: BigInt(7),
      email: 'encrypted:person@example.com',
      password_hash: null,
    });

    await expect(validateCredentials('person@example.com', 'any-password')).resolves.toEqual({ user: null });
    expect(compare).not.toHaveBeenCalled();
  });

  it('returns the public UUID instead of the internal database ID', async () => {
    const publicUserId = '3d594650-3436-4aa2-bb39-9fc9f5bc521d';
    compare.mockResolvedValue(true);
    userRepository.findUnique.mockResolvedValue({
      id: BigInt(7),
      public_id: publicUserId,
      email: 'encrypted:person@example.com',
      password_hash: 'hashed-password',
      ai_recommendation_enabled: true,
      role: 'USER',
      session_version: 2,
      created_at: new Date('2026-07-23T00:00:00.000Z'),
    });

    const result = await validateCredentials('person@example.com', 'valid-password');
    expect(result.user?.id).toBe(publicUserId);
    expect(result.user).not.toHaveProperty('internal_id');
  });
});
