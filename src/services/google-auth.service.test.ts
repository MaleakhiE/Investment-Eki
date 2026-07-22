const userRepository = {
  findUnique: jest.fn(),
  create: jest.fn(),
};
const oauthAccountRepository = {
  findUnique: jest.fn(),
  create: jest.fn(),
};
const transaction = jest.fn(async (callback: (tx: unknown) => unknown) => callback({
  user: userRepository,
  oauthAccount: oauthAccountRepository,
}));

jest.mock('@/lib/prisma', () => ({ prisma: { $transaction: transaction } }));
jest.mock('@/lib/encryption', () => ({
  encryptDeterministic: (value: string) => `encrypted:${value}`,
}));

import { provisionGoogleUser } from './google-auth.service';

const existingUser = {
  id: BigInt(7),
  ai_recommendation_enabled: true,
  role: 'USER',
  session_version: 3,
};

describe('Google OAuth user provisioning', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects an identity without a stable subject and verified valid email', async () => {
    await expect(provisionGoogleUser({
      email: 'person@example.com',
      email_verified: true,
    })).rejects.toThrow('verified email');
    await expect(provisionGoogleUser({
      sub: 'google-user-1',
      email: 'not-an-email',
      email_verified: true,
    })).rejects.toThrow('verified email');
    await expect(provisionGoogleUser({
      sub: 'google-user-1',
      email: 'person@example.com',
      email_verified: false,
    })).rejects.toThrow('verified email');

    expect(transaction).not.toHaveBeenCalled();
  });

  it('uses the stable Google subject on subsequent logins', async () => {
    oauthAccountRepository.findUnique.mockResolvedValue({ user: existingUser });

    await expect(provisionGoogleUser({
      sub: 'google-user-7',
      email: 'new-address@example.com',
      email_verified: true,
    })).resolves.toEqual(expect.objectContaining({ id: '7', role: 'USER' }));

    expect(oauthAccountRepository.findUnique).toHaveBeenCalledWith({
      where: {
        provider_provider_account_id: {
          provider: 'google',
          provider_account_id: 'google-user-7',
        },
      },
      include: { user: true },
    });
    expect(userRepository.findUnique).not.toHaveBeenCalled();
  });

  it('links a verified Google identity to an existing encrypted-email user without changing its role', async () => {
    oauthAccountRepository.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    userRepository.findUnique.mockResolvedValue({ ...existingUser, role: 'SUPERADMIN' });
    oauthAccountRepository.create.mockResolvedValue({});

    await expect(provisionGoogleUser({
      sub: 'google-owner',
      email: ' Ekiputra234@gmail.com ',
      email_verified: true,
    })).resolves.toEqual(expect.objectContaining({
      id: '7',
      role: 'SUPERADMIN',
    }));

    expect(oauthAccountRepository.create).toHaveBeenCalledWith({
      data: {
        user_id: BigInt(7),
        provider: 'google',
        provider_account_id: 'google-owner',
      },
    });
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('creates new Google users with the standard USER role', async () => {
    oauthAccountRepository.findUnique.mockResolvedValue(null);
    userRepository.findUnique.mockResolvedValue(null);
    userRepository.create.mockResolvedValue(existingUser);
    oauthAccountRepository.create.mockResolvedValue({});

    await provisionGoogleUser({
      sub: 'google-new-user',
      email: 'owner@example.com',
      email_verified: true,
    });

    expect(userRepository.create).toHaveBeenCalledWith({
      data: {
        email: 'encrypted:owner@example.com',
        password_hash: null,
        role: 'USER',
      },
    });
  });

  it('rejects linking a second Google identity to the same FinTrack user', async () => {
    oauthAccountRepository.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: BigInt(10) });
    userRepository.findUnique.mockResolvedValue(existingUser);

    await expect(provisionGoogleUser({
      sub: 'different-google-user',
      email: 'person@example.com',
      email_verified: true,
    })).rejects.toThrow('already linked');
    expect(oauthAccountRepository.create).not.toHaveBeenCalled();
  });
});
