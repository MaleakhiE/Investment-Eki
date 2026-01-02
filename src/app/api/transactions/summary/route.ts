/**
 * Transaction Summary API Route
 * 
 * GET /api/transactions/summary?month=YYYY-MM - Get monthly summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { getMonthlySummary } from '@/services/transaction.service';
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  serverErrorResponse,
} from '@/lib/api-response';

/**
 * GET /api/transactions/summary - Get monthly summary
 * Query params: month (YYYY-MM format, defaults to current month)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let month = searchParams.get('month');

    // Default to current month
    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        validationErrorResponse(['Invalid month format. Use YYYY-MM']),
        { status: 400 }
      );
    }

    const summary = await getMonthlySummary(userId, month);

    return NextResponse.json(
      successResponse(summary, 'Monthly summary retrieved successfully')
    );
  } catch (error) {
    console.error('Error getting monthly summary:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
