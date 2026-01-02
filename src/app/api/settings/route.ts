/**
 * Settings API Route
 * 
 * GET /api/settings - Get user settings
 */

import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { getUserSettings } from '@/services/settings.service';
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const settings = await getUserSettings(userId);

    if (!settings) {
      return NextResponse.json(serverErrorResponse('Failed to retrieve settings'), {
        status: 500,
      });
    }

    return NextResponse.json(successResponse(settings, 'Settings retrieved successfully'));
  } catch (error) {
    console.error('Error getting settings:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
