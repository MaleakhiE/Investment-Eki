import { readAuthEnvironment, requireAuthEnvironment } from './auth-environment';

describe('Auth environment', () => {
  it('prefers AUTH_SECRET and AUTH_URL aliases', () => {
    expect(readAuthEnvironment({
      AUTH_SECRET: 'a'.repeat(32),
      NEXTAUTH_SECRET: 'b'.repeat(32),
      AUTH_URL: 'https://fintrack.example',
      NEXTAUTH_URL: 'http://localhost:3000',
    })).toEqual({
      secret: 'a'.repeat(32),
      url: 'https://fintrack.example',
      errors: [],
    });
  });

  it('rejects example secrets instead of allowing unstable sessions', () => {
    expect(readAuthEnvironment({
      NEXTAUTH_SECRET: 'your-nextauth-secret-here',
      NEXTAUTH_URL: 'http://localhost:3000',
    }).errors).toEqual([
      'Auth secret must be a non-placeholder value of at least 32 characters',
    ]);
  });

  it('rejects the documented generate-secret placeholder', () => {
    expect(readAuthEnvironment({
      NEXTAUTH_SECRET: 'generate-a-random-secret-at-least-32-characters-long',
      NEXTAUTH_URL: 'http://localhost:3000',
    }).errors).toEqual([
      'Auth secret must be a non-placeholder value of at least 32 characters',
    ]);
  });

  it('fails closed without exposing secret values', () => {
    expect(() => requireAuthEnvironment({
      NEXTAUTH_SECRET: 'short',
      NEXTAUTH_URL: 'https://fintrack.example',
    })).toThrow('Auth environment is invalid: Auth secret must be a non-placeholder value of at least 32 characters');
  });

  it('returns the validated aliases for Auth.js configuration', () => {
    expect(requireAuthEnvironment({
      AUTH_SECRET: 'a'.repeat(32),
      AUTH_URL: 'https://fintrack.example',
    })).toEqual({ secret: 'a'.repeat(32), url: 'https://fintrack.example', errors: [] });
  });
});
