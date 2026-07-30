import { readAuthEnvironment } from './auth-environment';

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
});
