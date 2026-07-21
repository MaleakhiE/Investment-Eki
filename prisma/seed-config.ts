export interface SeedAdminConfig {
  email: string;
  password: string;
}

export function resolveSeedAdminConfig(
  environment: Record<string, string | undefined> = process.env,
): SeedAdminConfig {
  const email = environment.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = environment.SUPERADMIN_PASSWORD;

  if (!email) {
    throw new Error('SUPERADMIN_EMAIL is required for database seeding');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('SUPERADMIN_EMAIL must be a valid email address');
  }
  if (!password) {
    throw new Error('SUPERADMIN_PASSWORD is required for database seeding');
  }
  if (password.length < 12) {
    throw new Error('SUPERADMIN_PASSWORD must contain at least 12 characters');
  }

  return { email, password };
}
