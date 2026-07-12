import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-response';

const attempts = new Map<string, number[]>();

export function rejectCrossSiteRequest(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  const requestedWith = request.headers.get('x-requested-with');
  if (!origin || origin !== new URL(request.url).origin || requestedWith !== 'XMLHttpRequest') {
    return NextResponse.json(errorResponse('Invalid request origin', 403), { status: 403 });
  }
  return null;
}

export function rateLimitAdminAction(key: string, limit: number, windowMs: number): NextResponse | null {
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
  if (recent.length >= limit) return NextResponse.json(errorResponse('Too many requests', 429), { status: 429 });
  attempts.set(key, [...recent, now]);
  return null;
}
