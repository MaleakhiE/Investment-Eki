import { ensureSeedSuperadmin } from '../../prisma/seed-superadmin';

describe('superadmin bootstrap', () => {
  it('creates the configured owner as SUPERADMIN', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: BigInt(1) });

    await ensureSeedSuperadmin(
      { user: { upsert } },
      { email: 'ekiputra234@gmail.com', password: 'a-strong-bootstrap-password' },
      {
        encryptEmail: () => 'encrypted-owner-email',
        hashPassword: async () => 'hashed-bootstrap-password',
      },
    );

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        email: 'encrypted-owner-email',
        password_hash: 'hashed-bootstrap-password',
        role: 'SUPERADMIN',
      }),
    }));
  });

  it('replaces credentials and revokes sessions when repairing an existing owner account', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: BigInt(1) });

    await ensureSeedSuperadmin(
      { user: { upsert } },
      { email: 'ekiputra234@gmail.com', password: 'a-strong-bootstrap-password' },
      {
        encryptEmail: () => 'encrypted-owner-email',
        hashPassword: async () => 'hashed-bootstrap-password',
      },
    );

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: {
        password_hash: 'hashed-bootstrap-password',
        role: 'SUPERADMIN',
        session_version: { increment: 1 },
      },
    }));
  });
});
