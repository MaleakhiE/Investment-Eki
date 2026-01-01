/**
 * NextAuth.js API Route Handler
 * 
 * Handles all authentication-related API routes:
 * - POST /api/auth/signin
 * - POST /api/auth/signout
 * - GET /api/auth/session
 * - GET /api/auth/csrf
 * - GET /api/auth/providers
 */

import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
