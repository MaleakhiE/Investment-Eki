/**
 * Single Month Cashflow API Route
 * 
 * GET /api/cashflow/[month] - Get cashflow for a specific month
 * 
 * Requirements: 2.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { getCashflowByMonth } from '@/services/cashflow.service';
import { validateMonth } from '@/lib/validation';
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { safeDatabaseErrorCode } from '@/lib/error-safety';

interface RouteParams {
  params: Promise<{ month: string }>;
}

/**
 * GET /api/cashflow/[month] - Get cashflow for a specific month
 * Requirements: 2.4
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { month } = await params;

    // Validate month format
    const monthValidation = validateMonth(month);
    if (!monthValidation.valid) {
      return NextResponse.json(
        validationErrorResponse(monthValidation.errors),
        { status: 400 }
      );
    }

    const cashflow = await getCashflowByMonth(userId, month);

    if (!cashflow) {
      return NextResponse.json(
        notFoundResponse(`Cashflow for month ${month} not found`),
        { status: 404 }
      );
    }

    // Convert bigint to string for JSON serialization
    const { user_id: internalUserId, ...publicCashflow } = cashflow;
    void internalUserId;
    const cashflowResponse = {
      ...publicCashflow,
      id: publicCashflow.id.toString(),
    };

    return NextResponse.json(
      successResponse(cashflowResponse, 'Cashflow retrieved successfully')
    );
  } catch (error) {
    console.error('Error getting cashflow:', { code: safeDatabaseErrorCode(error) });
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
