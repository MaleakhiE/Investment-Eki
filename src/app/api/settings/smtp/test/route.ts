/**
 * SMTP Test API Route
 * 
 * POST /api/settings/smtp/test - Test SMTP connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { testSmtpConnection, SmtpSettingsInput } from '@/services/smtp.service';
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  serverErrorResponse,
} from '@/lib/api-response';

/**
 * POST /api/settings/smtp/test - Test SMTP connection
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    let body: SmtpSettingsInput;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        validationErrorResponse(['Invalid JSON body']),
        { status: 400 }
      );
    }

    const result = await testSmtpConnection({
      host: body.host,
      port: body.port,
      user: body.user,
      pass: body.pass,
      from_email: body.from_email,
    });

    if (!result.success) {
      return NextResponse.json(
        validationErrorResponse([result.error || 'SMTP connection test failed']),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse({ connected: true }, 'SMTP connection successful')
    );
  } catch (error) {
    console.error('Error testing SMTP:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
