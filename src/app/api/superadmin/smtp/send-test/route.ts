import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth';
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';
import { sendSmtpMail } from '@/services/smtp.service';
import { validateEmail } from '@/lib/validation';
import { rateLimitAdminAction, rejectCrossSiteRequest } from '@/lib/admin-request';
export async function POST(request: NextRequest) {
  const access = await requireSuperadmin();
  if ('status' in access) return NextResponse.json(access.status === 401 ? unauthorizedResponse() : errorResponse('Forbidden', 403), { status: access.status });
  const rejected = rejectCrossSiteRequest(request); if (rejected) return rejected;
  const limited = rateLimitAdminAction(`smtp-send:${access.userId}`, 5, 60_000); if (limited) return limited;
  try {
    const body = await request.json();
    if (typeof body.recipient !== 'string' || !validateEmail(body.recipient).valid) return NextResponse.json(errorResponse('Valid recipient email is required', 400), { status: 400 });
    await sendSmtpMail({ to: body.recipient.trim(), subject: 'SMTP test', html: '<p>Your global SMTP configuration is working.</p>' });
    return NextResponse.json(successResponse(null, 'Test email sent'));
  } catch { return NextResponse.json(errorResponse('Unable to send test email', 502), { status: 502 }); }
}
