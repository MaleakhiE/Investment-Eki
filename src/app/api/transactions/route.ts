/**
 * Transactions API Routes
 * 
 * POST /api/transactions - Create a new transaction
 * GET /api/transactions - Get transactions (with optional date filter)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { createTransaction, getTransactions, TransactionInput } from '@/services/transaction.service';
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  serverErrorResponse,
} from '@/lib/api-response';

/**
 * POST /api/transactions - Create a new transaction
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    let body: TransactionInput;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        validationErrorResponse(['Invalid JSON body']),
        { status: 400 }
      );
    }

    const result = await createTransaction(userId, body);

    if (!result.success) {
      return NextResponse.json(
        validationErrorResponse([result.error || 'Failed to create transaction']),
        { status: 400 }
      );
    }

    const transactionResponse = {
      ...result.transaction!,
      id: result.transaction!.id.toString(),
      user_id: result.transaction!.user_id.toString(),
    };

    return NextResponse.json(
      successResponse(transactionResponse, 'Transaction created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}

/**
 * GET /api/transactions - Get transactions with optional date filter
 * Query params: startDate, endDate (YYYY-MM-DD format), limit (number)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const transactions = await getTransactions(userId, startDate, endDate, limit);

    const transactionsResponse = transactions.map((t) => ({
      ...t,
      id: t.id.toString(),
      user_id: t.user_id.toString(),
    }));

    return NextResponse.json(
      successResponse({ transactions: transactionsResponse }, 'Transactions retrieved successfully')
    );
  } catch (error) {
    console.error('Error getting transactions:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
