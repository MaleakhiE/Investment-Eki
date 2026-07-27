jest.mock('./auth-session', () => ({ isSessionVersionCurrent: jest.fn() }));
jest.mock('@/services/google-auth.service', () => ({ resolveSessionUserForProvider: jest.fn() }));

import { isSessionVersionCurrent } from './auth-session';
import { resolveSessionUserForProvider } from '@/services/google-auth.service';
import { authConfig } from './auth.config';

type JwtCallback = (input: {
  token: Record<string, unknown>;
  user?: Record<string, unknown>;
  account?: Record<string, unknown>;
  profile?: Record<string, unknown>;
}) => Promise<Record<string, unknown>>;
type AuthorizedCallback = (input: { auth: { user: Record<string, unknown> } | null; request: { nextUrl: URL } }) => boolean | Response;
type SessionCallback = (input: { session: { user: Record<string, unknown> }; token: Record<string, unknown> }) => Promise<{ user: Record<string, unknown> }>;

const jwt = authConfig.callbacks?.jwt as unknown as JwtCallback;
const authorized = authConfig.callbacks?.authorized as unknown as AuthorizedCallback;
const session = authConfig.callbacks?.session as unknown as SessionCallback;
const publicUserId = '3d594650-3436-4aa2-bb39-9fc9f5bc521d';
const privatePaths = [
  '/dashboard',
  '/accounts',
  '/cashflow',
  '/investments',
  '/analytics',
  '/budget',
  '/goals',
  '/settings',
  '/superadmin/smtp',
];
const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/privacy'];

describe('protected page authorization', () => {
  it.each(privatePaths)('rejects an anonymous request to %s', (pathname) => {
    expect(authorized({
      auth: null,
      request: { nextUrl: new URL(pathname, 'https://fintrack.example') },
    })).toBe(false);
  });

  it.each(privatePaths)('rejects an invalidated session on %s', (pathname) => {
    expect(authorized({
      auth: { user: { id: publicUserId, session_invalidated: true } },
      request: { nextUrl: new URL(pathname, 'https://fintrack.example') },
    })).toBe(false);
  });

  it.each(privatePaths)('allows a valid session on %s', (pathname) => {
    expect(authorized({
      auth: { user: { id: publicUserId, session_invalidated: false } },
      request: { nextUrl: new URL(pathname, 'https://fintrack.example') },
    })).toBe(true);
  });

  it.each(publicPaths)('keeps the public page %s available anonymously', (pathname) => {
    expect(authorized({
      auth: null,
      request: { nextUrl: new URL(pathname, 'https://fintrack.example') },
    })).toBe(true);
  });

  it('redirects an authenticated user away from the login page', () => {
    const response = authorized({
      auth: { user: { id: publicUserId, session_invalidated: false } },
      request: { nextUrl: new URL('https://fintrack.example/login') },
    });

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).headers.get('location')).toBe('https://fintrack.example/dashboard');
  });
});

describe('JWT session revocation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('stores the authoritative session version in a newly issued token', async () => {
    const token = await jwt({
      token: {},
      user: {
        id: publicUserId, email: 'person@example.com', role: 'USER',
        ai_recommendation_enabled: true, session_version: 4,
      },
    });

    expect(token).toEqual(expect.objectContaining({
      id: publicUserId, session_version: 4, session_invalidated: false,
    }));
  });

  it('stores the FinTrack user rather than the temporary Auth.js UUID for Google login', async () => {
    jest.mocked(resolveSessionUserForProvider).mockResolvedValue({
      id: publicUserId,
      email: 'person@example.com',
      ai_recommendation_enabled: true,
      role: 'USER',
      session_version: 2,
    });

    const token = await jwt({
      token: {},
      user: { id: 'temporary-authjs-uuid', email: 'person@example.com' },
      account: { provider: 'google' },
      profile: { sub: 'google-subject', email: 'person@example.com', email_verified: true },
    });

    expect(token).toEqual(expect.objectContaining({
      id: publicUserId,
      session_version: 2,
      session_invalidated: false,
    }));
  });

  it('marks an existing token invalid when the database version changes', async () => {
    jest.mocked(isSessionVersionCurrent).mockResolvedValue(false);
    const token = await jwt({ token: { id: publicUserId, session_version: 3 } });

    expect(token.session_invalidated).toBe(true);
    expect(authorized({
      auth: { user: { id: publicUserId, session_invalidated: true } },
      request: { nextUrl: new URL('https://fintrack.example/dashboard') },
    })).toBe(false);
    await expect(session({
      session: { user: {} },
      token: { id: publicUserId, email: 'person@example.com', role: 'USER', session_invalidated: true },
    })).resolves.toEqual(expect.objectContaining({
      user: expect.objectContaining({ id: '', session_invalidated: true }),
    }));
  });
});
