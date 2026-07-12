import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth';
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';
import { verifyGlobalSmtp } from '@/services/smtp.service';
import { rateLimitAdminAction, rejectCrossSiteRequest } from '@/lib/admin-request';
export async function POST(request: NextRequest) {
  const access = await requireSuperadmin();
  if ('status' in access) return NextResponse.json(access.status === 401 ? unauthorizedResponse() : errorResponse('Forbidden', 403), { status: access.status });
  const rejected = rejectCrossSiteRequest(request); if (rejected) return rejected;
  const limited = rateLimitAdminAction(`smtp-verify:${access.userId}`, 5, 60_000); if (limited) return limited;
  try { await verifyGlobalSmtp(); return NextResponse.json(successResponse({ connected: true }, 'SMTP connection verified')); }
  catch { return NextResponse.json(errorResponse('Unable to verify SMTP connection', 502), { status: 502 }); }
}
