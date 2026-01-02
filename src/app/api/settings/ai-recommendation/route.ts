/**
 * AI Recommendation Settings API Route
 * 
 * PATCH /api/settings/ai-recommendation - Toggle AI recommendation setting
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { updateAIRecommendationSetting } from '@/services/settings.service';
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  serverErrorResponse,
} from '@/lib/api-response';

interface UpdateAISettingBody {
  enabled: boolean;
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    let body: UpdateAISettingBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        validationErrorResponse(['Invalid JSON body']),
        { status: 400 }
      );
    }

    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json(
        validationErrorResponse(['enabled must be a boolean']),
        { status: 400 }
      );
    }

    const settings = await updateAIRecommendationSetting(userId, body.enabled);

    if (!settings) {
      return NextResponse.json(serverErrorResponse('Failed to update settings'), {
        status: 500,
      });
    }

    return NextResponse.json(
      successResponse(settings, 'AI recommendation setting updated successfully')
    );
  } catch (error) {
    console.error('Error updating AI recommendation setting:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
