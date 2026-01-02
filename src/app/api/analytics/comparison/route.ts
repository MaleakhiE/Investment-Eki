/**
 * Investment Comparison Analytics API Route
 * 
 * GET /api/analytics/comparison - Get Gold vs Mutual Fund comparison
 * 
 * Requirements: 4.4
 */

import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { getInvestmentComparison } from '@/services/analytics.service';
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';

/**
 * GET /api/analytics/comparison - Get Gold vs Mutual Fund comparison
 * Requirements: 4.4
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const comparison = await getInvestmentComparison(userId);

    return NextResponse.json(
      successResponse(comparison, 'Investment comparison retrieved successfully')
    );
  } catch (error) {
    console.error('Error getting investment comparison:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
