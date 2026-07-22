/**
 * NextAuth.js Configuration
 * 
 * Configures authentication with:
 * - Credentials Provider for email/password login
 * - JWT session strategy
 * - Custom session and JWT callbacks
 */

import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { authConfig } from './auth.config';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      ai_recommendation_enabled: boolean;
      role: 'USER' | 'SUPERADMIN';
      session_invalidated?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    email: string;
    ai_recommendation_enabled: boolean;
    role: 'USER' | 'SUPERADMIN';
    session_version: number;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Dynamic import to avoid Edge Runtime issues
        const { validateCredentials } = await import('@/services/auth.service');
        const result = await validateCredentials(email, password);

        if (!result.user) {
          return null;
        }

        return {
          id: result.user.id.toString(),
          email: result.user.email,
          ai_recommendation_enabled: result.user.ai_recommendation_enabled,
          role: result.user.role,
          session_version: result.user.session_version,
        };
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
});

/**
 * Get the current authenticated session
 * Returns null if not authenticated
 */
export async function getSession() {
  return await auth();
}

/**
 * Check if the current request is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await auth();
  return !!session?.user;
}

/**
 * Get the current user ID from session
 * Returns null if not authenticated
 */
export async function getCurrentUserId(): Promise<bigint | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return BigInt(session.user.id);
}

export async function requireSuperadmin(): Promise<{ userId: bigint } | { status: 401 | 403 }> {
  const userId = await getCurrentUserId();
  if (!userId) return { status: 401 };
  const { prisma } = await import('@/lib/prisma');
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === 'SUPERADMIN' ? { userId } : { status: 403 };
}
