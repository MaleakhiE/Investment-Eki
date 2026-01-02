/**
 * Portfolio Analytics API Route
 * 
 * GET /api/analytics/portfolio - Get portfolio summary and growth
 * 
 * Requirements: 4.2, 4.3
 */

import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { getPortfolioSummary, getPortfolioGrowth } from '@/services/analytics.service';
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';

/**
 * GET /api/analytics/portfolio - Get portfolio summary and growth
 * Requirements: 4.2, 4.3
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const [summary, growth] = await Promise.all([
      getPortfolioSummary(userId),
      getPortfolioGrowth(userId),
    ]);

    return NextResponse.json(
      successResponse(
        {
          summary,
          growth,
        },
        'Portfolio analytics retrieved successfully'
      )
    );
  } catch (error) {
    console.error('Error getting portfolio analytics:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
