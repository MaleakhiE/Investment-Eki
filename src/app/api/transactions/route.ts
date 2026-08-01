/**
 * Transactions API Routes
 * 
 * POST /api/transactions - Create a new transaction
 * GET /api/transactions - Get transactions (with optional date filter)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { parseCalendarDate } from '@/lib/financial-input';
import { safeDatabaseErrorCode } from '@/lib/error-safety';
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

    const idempotencyKey = request.headers.get('Idempotency-Key') ?? undefined;
    const result = await createTransaction(userId, body, undefined, idempotencyKey);

    if (!result.success) {
      const status = result.error === 'Idempotency key already used for a different transaction' ? 409 : 400;
      return NextResponse.json(
        validationErrorResponse([result.error || 'Failed to create transaction']),
        { status }
      );
    }

    const { user_id: internalUserId, ...transaction } = result.transaction!;
    void internalUserId;
    const transactionResponse = {
      ...transaction,
      id: transaction.id.toString(),
      account_id: transaction.account_id?.toString() ?? null,
      destination_account_id: transaction.destination_account_id?.toString() ?? null,
    };

    return NextResponse.json(
      successResponse(transactionResponse, 'Transaction created successfully'),
      { status: result.replayed ? 200 : 201 }
    );
  } catch (error) {
    console.error('Error creating transaction:', { code: safeDatabaseErrorCode(error) });
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
    const startDateRaw = searchParams.get('startDate');
    const endDateRaw = searchParams.get('endDate');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateRaw) {
      const parsed = parseCalendarDate(startDateRaw);
      if (!parsed) {
        return NextResponse.json(
          validationErrorResponse(['Invalid startDate. Use YYYY-MM-DD with a valid calendar date']),
          { status: 400 }
        );
      }
      startDate = parsed;
    }

    if (endDateRaw) {
      const parsed = parseCalendarDate(endDateRaw);
      if (!parsed) {
        return NextResponse.json(
          validationErrorResponse(['Invalid endDate. Use YYYY-MM-DD with a valid calendar date']),
          { status: 400 }
        );
      }
      endDate = parsed;
    }

    if (startDate && endDate && startDate > endDate) {
      return NextResponse.json(
        validationErrorResponse(['startDate must not be after endDate']),
        { status: 400 }
      );
    }

    const transactions = await getTransactions(userId, startDateRaw ?? undefined, endDateRaw ?? undefined, limit);

    const transactionsResponse = transactions.map(({ user_id: internalUserId, ...transaction }) => {
      void internalUserId;
      return {
        ...transaction,
        id: transaction.id.toString(),
        account_id: transaction.account_id?.toString() ?? null,
        destination_account_id: transaction.destination_account_id?.toString() ?? null,
      };
    });

    return NextResponse.json(
      successResponse({ transactions: transactionsResponse }, 'Transactions retrieved successfully')
    );
  } catch (error) {
    console.error('Error getting transactions:', { code: safeDatabaseErrorCode(error) });
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
