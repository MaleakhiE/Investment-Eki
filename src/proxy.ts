/**
 * Auth proxy for routes that require authentication.
 *
 * Next.js 16 runs this network boundary on the Node.js runtime.
 */

import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextRequest } from 'next/server';

const { auth } = NextAuth(authConfig);

export async function proxy(request: NextRequest) {
  // NextAuth's overloaded middleware type does not expose the request-only call,
  // although that is the supported runtime shape for this wrapper.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return auth(request as any);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api/auth (NextAuth routes)
     * - api/health (public platform health probes)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|api/auth|api/health).*)',
  ],
};
