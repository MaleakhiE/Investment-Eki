/**
 * Cashflow Trend Analytics API Route
 * 
 * GET /api/analytics/cashflow-trend - Get monthly net cashflow trend
 * 
 * Requirements: 4.1
 */

import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { safeDatabaseErrorCode } from '@/lib/error-safety';
import { getCashflowTrend } from '@/services/analytics.service';
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';

/**
 * GET /api/analytics/cashflow-trend - Get monthly net cashflow trend
 * Requirements: 4.1
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const trend = await getCashflowTrend(userId);

    return NextResponse.json(
      successResponse(trend, 'Cashflow trend retrieved successfully')
    );
  } catch (error) {
    console.error('Error getting cashflow trend:', { code: safeDatabaseErrorCode(error) });
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
