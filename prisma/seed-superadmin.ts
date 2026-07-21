import type { SeedAdminConfig } from './seed-config';

interface SeedUserClient {
  user: {
    upsert(args: {
      where: { email: string };
      update: {
        password_hash: string;
        role: 'SUPERADMIN';
        session_version: { increment: number };
      };
      create: {
        email: string;
        password_hash: string;
        ai_recommendation_enabled: boolean;
        role: 'SUPERADMIN';
      };
    }): Promise<{ id: bigint }>;
  };
}

interface SeedSuperadminDependencies {
  encryptEmail(email: string): string;
  hashPassword(password: string): Promise<string>;
}

export async function ensureSeedSuperadmin(
  client: SeedUserClient,
  config: SeedAdminConfig,
  dependencies: SeedSuperadminDependencies,
): Promise<{ id: bigint }> {
  const encryptedEmail = dependencies.encryptEmail(config.email);
  const passwordHash = await dependencies.hashPassword(config.password);

  return client.user.upsert({
    where: { email: encryptedEmail },
    update: {
      password_hash: passwordHash,
      role: 'SUPERADMIN',
      session_version: { increment: 1 },
    },
    create: {
      email: encryptedEmail,
      password_hash: passwordHash,
      ai_recommendation_enabled: true,
      role: 'SUPERADMIN',
    },
  });
}
