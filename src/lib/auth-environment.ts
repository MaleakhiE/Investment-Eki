const PLACEHOLDER_SECRET_PATTERN = /^(your-|generate[-_ ]|change[-_ ]|replace[-_ ])/i;

export interface AuthEnvironment {
  secret: string | undefined;
  url: string | undefined;
  errors: string[];
}

export function readAuthEnvironment(env: Record<string, string | undefined> = process.env): AuthEnvironment {
  const secret = env.AUTH_SECRET?.trim() || env.NEXTAUTH_SECRET?.trim();
  const url = env.AUTH_URL?.trim() || env.NEXTAUTH_URL?.trim();
  const errors: string[] = [];

  if (!secret) errors.push('AUTH_SECRET or NEXTAUTH_SECRET is required');
  if (secret && (secret.length < 32 || PLACEHOLDER_SECRET_PATTERN.test(secret))) {
    errors.push('Auth secret must be a non-placeholder value of at least 32 characters');
  }
  if (!url) errors.push('AUTH_URL or NEXTAUTH_URL is required');

  return { secret, url, errors };
}

export function requireAuthEnvironment(
  env: Record<string, string | undefined> = process.env,
): AuthEnvironment {
  const environment = readAuthEnvironment(env);
  if (environment.errors.length > 0) {
    throw new Error(`Auth environment is invalid: ${environment.errors.join('; ')}`);
  }
  return environment;
}
