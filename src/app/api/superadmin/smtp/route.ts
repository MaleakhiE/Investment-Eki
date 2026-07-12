import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth';
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';
import { getGlobalSmtpStatus, saveGlobalSmtpSettings } from '@/services/smtp.service';
import { rejectCrossSiteRequest } from '@/lib/admin-request';
const denied = (status: 401 | 403) => NextResponse.json(status === 401 ? unauthorizedResponse() : errorResponse('Forbidden', 403), { status });
export async function GET() {
  const access = await requireSuperadmin(); if ('status' in access) return denied(access.status);
  return NextResponse.json(successResponse(await getGlobalSmtpStatus()));
}
export async function PUT(request: NextRequest) {
  const access = await requireSuperadmin(); if ('status' in access) return denied(access.status);
  const rejected = rejectCrossSiteRequest(request); if (rejected) return rejected;
  try {
    const body = await request.json();
    if (typeof body.host !== 'string' || typeof body.port !== 'number' || typeof body.username !== 'string' || typeof body.fromAddress !== 'string' || (body.password !== undefined && typeof body.password !== 'string')) return NextResponse.json(errorResponse('Invalid SMTP configuration', 400), { status: 400 });
    await saveGlobalSmtpSettings({ host: body.host, port: body.port, user: body.username, password: body.password, from: body.fromAddress });
    return NextResponse.json(successResponse(await getGlobalSmtpStatus(), 'SMTP configuration saved'));
  } catch (error) {
    const validationMessages = ['Host and from address are required', 'Host must be a valid SMTP hostname', 'SMTP host is not allowed', 'Port must be an integer between 1 and 65535', 'Username is too long', 'Password is too long', 'From address is too long', 'From address must be a valid email', 'Username and password are required for initial SMTP configuration'];
    const isValidationError = error instanceof Error && validationMessages.includes(error.message);
    const message = error instanceof SyntaxError ? 'Invalid JSON body' : isValidationError ? error.message : 'Unable to save SMTP configuration';
    const status = error instanceof SyntaxError || isValidationError ? 400 : 500;
    return NextResponse.json(errorResponse(message, status), { status });
  }
}
