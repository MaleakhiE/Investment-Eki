const userRepository = { findUnique: jest.fn() };
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
});
