import { NextRequest, NextResponse } from 'next/server';
import { successResponse, validationErrorResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';
import { resetPassword } from '@/services/password-reset.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as { token?: unknown; password?: unknown } | null;
    const errors: string[] = [];
    if (!body || typeof body.token !== 'string' || !body.token) errors.push('token is required');
    if (!body || typeof body.password !== 'string') errors.push('password is required');
    if (errors.length) return NextResponse.json(validationErrorResponse(errors), { status: 400 });
    const result = await resetPassword(body!.token as string, body!.password as string);
    if (!result.success) return NextResponse.json(errorResponse(result.error || 'Password reset failed', 400), { status: 400 });
    return NextResponse.json(successResponse(null, 'Password reset successfully'));
  } catch {
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
