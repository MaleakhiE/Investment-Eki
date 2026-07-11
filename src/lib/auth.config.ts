/**
 * NextAuth.js Configuration (Edge-compatible)
 * 
 * This file contains the NextAuth configuration that can run in Edge Runtime.
 * It does NOT include the authorize function which requires Node.js modules.
 */

import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      
      // Protected routes
      const protectedRoutes = [
        '/dashboard',
        '/cashflow',
        '/investments',
        '/settings',
        '/analytics',
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
  providers: [], // Providers are added in auth.ts
};
