'use client';

/**
 * Session Provider Wrapper
 * 
 * Wraps the application with NextAuth SessionProvider
 * to enable client-side session access.
 */

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export default function SessionProvider({ children }: Props) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
