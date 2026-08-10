/**
 * NextAuth.js Configuration (Edge-compatible)
 * 
 * This file contains the NextAuth configuration that can run in Edge Runtime.
 * It does NOT include the authorize function which requires Node.js modules.
 */

import type { NextAuthConfig } from 'next-auth';
import { isSessionVersionCurrent } from './auth-session';
import { requireAuthEnvironment } from './auth-environment';

const authEnvironment = requireAuthEnvironment();

export const authConfig: NextAuthConfig = {
  // Resolve once so the proxy and the Node handlers cannot use different env aliases.
  secret: authEnvironment.secret,
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user && !auth.user.session_invalidated;
      const pathname = nextUrl.pathname;
      
      // Protected routes
      const protectedRoutes = [
        '/dashboard',
        '/accounts',
        '/cashflow',
        '/investments',
        '/budget',
        '/goals',
        '/settings',
        '/analytics',
        '/superadmin',
      ];
      
      // Public authentication routes. Authenticated users do not need these flows.
      const authRoutes = ['/login', '/register', '/forgot-password'];
      
      const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
      const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
      
      // Redirect authenticated users away from auth routes
      if (isAuthRoute && isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      
      // Require auth for protected routes
      if (isProtectedRoute) {
        return isLoggedIn;
      }
      
      return true;
    },
    async jwt({ token, user, account, profile }) {
      let sessionUser = user;
      if (user && account?.provider === 'google' && profile) {
        const { resolveSessionUserForProvider } = await import('@/services/google-auth.service');
        sessionUser = await resolveSessionUserForProvider({
          user,
          account,
          profile,
        }) as typeof user;
      }

      if (sessionUser) {
        token.id = sessionUser.id;
        token.email = sessionUser.email;
        token.ai_recommendation_enabled = sessionUser.ai_recommendation_enabled;
        token.role = sessionUser.role;
        token.session_version = sessionUser.session_version;
        token.session_invalidated = false;
      } else if (token.id) {
        token.session_invalidated = !(await isSessionVersionCurrent(
          token.id as string,
          token.session_version,
        ));
      }
      return token;
    },
    async session({ session, token }) {
      const sessionInvalidated = Boolean(token.session_invalidated);
      session.user = {
        ...session.user,
        id: sessionInvalidated ? '' : token.id as string,
        email: token.email as string,
        ai_recommendation_enabled: token.ai_recommendation_enabled as boolean,
        role: token.role as 'USER' | 'SUPERADMIN',
        session_invalidated: sessionInvalidated,
      };
      return session;
    },
  },
  providers: [], // Providers are added in auth.ts
};
