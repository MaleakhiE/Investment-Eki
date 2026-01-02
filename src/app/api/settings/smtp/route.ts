/**
 * SMTP Settings API Routes
 * 
 * GET /api/settings/smtp - Get SMTP settings (masked password)
 * POST /api/settings/smtp - Save SMTP settings
 * DELETE /api/settings/smtp - Delete user SMTP settings (revert to env)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { 
  getSmtpSettingsForDisplay, 
  saveSmtpSettings, 
  deleteSmtpSettings,
  SmtpSettingsInput 
} from '@/services/smtp.service';
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  serverErrorResponse,
} from '@/lib/api-response';

/**
 * GET /api/settings/smtp - Get SMTP settings
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const settings = await getSmtpSettingsForDisplay(userId);

    return NextResponse.json(
      successResponse(settings, 'SMTP settings retrieved successfully')
    );
  } catch (error) {
    console.error('Error getting SMTP settings:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}

/**
 * POST /api/settings/smtp - Save SMTP settings
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

    const result = await saveSmtpSettings(userId, body);

    if (!result.success) {
      return NextResponse.json(
        validationErrorResponse([result.error || 'Failed to save SMTP settings']),
        { status: 400 }
      );
    }

    const settings = await getSmtpSettingsForDisplay(userId);

    return NextResponse.json(
      successResponse(settings, 'SMTP settings saved successfully')
    );
  } catch (error) {
    console.error('Error saving SMTP settings:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}

/**
 * DELETE /api/settings/smtp - Delete user SMTP settings
 */
export async function DELETE() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    await deleteSmtpSettings(userId);

    const settings = await getSmtpSettingsForDisplay(userId);

    return NextResponse.json(
      successResponse(settings, 'SMTP settings deleted, reverted to environment variables')
    );
  } catch (error) {
    console.error('Error deleting SMTP settings:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
