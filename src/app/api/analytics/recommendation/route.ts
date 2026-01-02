/**
 * AI Investment Recommendation API Route
 * 
 * GET /api/analytics/recommendation - Get AI-powered investment allocation recommendation
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.7, 12.2
 */

import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { isAIRecommendationEnabled } from '@/services/settings.service';
import { getInvestmentRecommendation } from '@/services/recommendation.service';
import {
  successResponse,
  unauthorizedResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-response';

/**
 * GET /api/analytics/recommendation - Get AI-powered investment allocation recommendation
 * 
 * Requirements:
 * - 11.1: Analyze user's net_cashflow history to determine investable surplus
 * - 11.2: Calculate recommended percentage allocation for Gold and Mutual Fund
 * - 11.3: Consider user's current portfolio balance
 * - 11.4: Provide clear explanation in Bahasa Indonesia
 * - 11.7: Display recommendation with percentage breakdown and reasoning
 * - 12.2: Check if AI recommendation is enabled before displaying
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    // Check if AI recommendation is enabled for this user (Requirement 12.2)
    const aiEnabled = await isAIRecommendationEnabled(userId);

    if (!aiEnabled) {
      return NextResponse.json(
        errorResponse(
          'AI recommendation is disabled. Enable it in settings to receive investment recommendations.',
          403
        ),
        { status: 403 }
      );
    }

    // Get investment recommendation
    const recommendation = await getInvestmentRecommendation(userId);

    return NextResponse.json(
      successResponse(recommendation, 'Investment recommendation generated successfully')
    );
  } catch (error) {
    console.error('Error getting investment recommendation:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
