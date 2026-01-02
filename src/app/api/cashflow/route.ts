/**
 * Cashflow API Routes
 * 
 * POST /api/cashflow - Create or update cashflow for a month
 * GET /api/cashflow - Get cashflow history
 * 
 * Requirements: 2.3, 2.4, 2.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { saveCashflow, getCashflowHistory } from '@/services/cashflow.service';
import { validateCashflowInput, CashflowInput } from '@/lib/validation';
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  serverErrorResponse,
} from '@/lib/api-response';

/**
 * POST /api/cashflow - Create or update cashflow for a month
 * Requirements: 2.3, 2.5
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    let body: CashflowInput;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        validationErrorResponse(['Invalid JSON body']),
        { status: 400 }
      );
    }

    // Validate input
    const validation = validateCashflowInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        validationErrorResponse(validation.errors),
        { status: 400 }
      );
    }

    // Save cashflow (upsert)
    const result = await saveCashflow(userId, body);

    if (!result.success) {
      return NextResponse.json(
        validationErrorResponse([result.error || 'Failed to save cashflow']),
        { status: 400 }
      );
    }

    // Convert bigint to string for JSON serialization
    const cashflowResponse = {
      ...result.cashflow!,
      id: result.cashflow!.id.toString(),
      user_id: result.cashflow!.user_id.toString(),
    };

    return NextResponse.json(
      successResponse(cashflowResponse, 'Cashflow saved successfully'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving cashflow:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}

/**
 * GET /api/cashflow - Get cashflow history
 * Requirements: 2.4
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const history = await getCashflowHistory(userId);

    // Convert bigint to string for JSON serialization
    const historyResponse = history.map((record) => ({
      ...record,
      id: record.id.toString(),
      user_id: record.user_id.toString(),
    }));

    return NextResponse.json(
      successResponse(historyResponse, 'Cashflow history retrieved successfully')
    );
  } catch (error) {
    console.error('Error getting cashflow history:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
