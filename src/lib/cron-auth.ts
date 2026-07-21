import crypto from 'crypto';

function constantTimeEqual(left: string, right: string): boolean {
  const leftDigest = crypto.createHash('sha256').update(left).digest();
  const rightDigest = crypto.createHash('sha256').update(right).digest();
  return crypto.timingSafeEqual(leftDigest, rightDigest);
}

/**
 * Authorizes internal scheduler requests and deliberately fails closed when the
 * deployment has not configured CRON_SECRET.
 */
export function verifyCronBearer(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return false;

  const provided = authorization.slice('Bearer '.length);
  if (!provided) return false;
  return constantTimeEqual(provided, expected);
}
