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
import { validateCredentials } from '@/services/auth.service';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      ai_recommendation_enabled: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    email: string;
    ai_recommendation_enabled: boolean;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
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

        const result = await validateCredentials(email, password);

        if (!result.user) {
          return null;
        }

        return {
          id: result.user.id.toString(),
          email: result.user.email,
          ai_recommendation_enabled: result.user.ai_recommendation_enabled,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.ai_recommendation_enabled = user.ai_recommendation_enabled;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.id as string,
        email: token.email as string,
        ai_recommendation_enabled: token.ai_recommendation_enabled as boolean,
      };
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
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
