import crypto from 'crypto';
import { after, NextRequest, NextResponse } from 'next/server';
import { successResponse, validationErrorResponse, serverErrorResponse } from '@/lib/api-response';
import { requestPasswordReset } from '@/services/password-reset.service';

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const LIMIT = 5;
const MAX_RATE_LIMIT_KEYS = 10_000;

function isLimited(key: string): boolean {
  const now = Date.now();
  if (attempts.size >= MAX_RATE_LIMIT_KEYS) {
    for (const [storedKey, value] of attempts) {
      if (value.resetAt <= now) attempts.delete(storedKey);
    }
    if (attempts.size >= MAX_RATE_LIMIT_KEYS) attempts.delete(attempts.keys().next().value!);
  }
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) { attempts.set(key, { count: 1, resetAt: now + WINDOW_MS }); return false; }
  current.count += 1;
  return current.count > LIMIT;
}

function getCanonicalApplicationUrl(): string | null {
  const configured = process.env.NEXTAUTH_URL;
  if (!configured) return null;
  try {
    const url = new URL(configured);
    const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !localHttp) return null;
    if (url.username || url.password) return null;
    return url.origin;
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as { email?: unknown } | null;
    if (!body || typeof body.email !== 'string') return NextResponse.json(validationErrorResponse(['email is required']), { status: 400 });
    const baseUrl = getCanonicalApplicationUrl();
    if (!baseUrl) return NextResponse.json(serverErrorResponse('Password reset is not configured'), { status: 500 });
    const normalizedEmail = body.email.trim().toLowerCase();
    const rateKey = crypto.createHash('sha256').update(normalizedEmail).digest('hex');
    if (!isLimited(rateKey)) {
      after(async () => {
        try { await requestPasswordReset(normalizedEmail, baseUrl); }
        catch { console.error('Password reset background task failed'); }
      });
    }
    return NextResponse.json(successResponse(null, 'If an account exists for that email, a reset link has been sent.'));
  } catch {
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
