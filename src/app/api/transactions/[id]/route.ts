/**
 * Transaction by ID API Routes
 * 
 * PUT /api/transactions/[id] - Update a transaction
 * DELETE /api/transactions/[id] - Delete a transaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { updateTransaction, deleteTransaction, TransactionInput } from '@/services/transaction.service';
import { parseDatabaseId } from '@/lib/database-id';
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/transactions/[id] - Update a transaction
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { id } = await params;
    const transactionId = parseDatabaseId(id);
    if (!transactionId) return NextResponse.json(validationErrorResponse(['Invalid transaction ID']), { status: 400 });

    let body: TransactionInput;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        validationErrorResponse(['Invalid JSON body']),
        { status: 400 }
      );
    }

    const result = await updateTransaction(userId, transactionId, body);

    if (!result.success) {
      if (result.error === 'Transaction not found') {
        return NextResponse.json(notFoundResponse('Transaction'), { status: 404 });
      }
      return NextResponse.json(
        validationErrorResponse([result.error || 'Failed to update transaction']),
        { status: 400 }
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
      successResponse(transactionResponse, 'Transaction updated successfully')
    );
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}

/**
 * DELETE /api/transactions/[id] - Delete a transaction
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { id } = await params;
    const transactionId = parseDatabaseId(id);
    if (!transactionId) return NextResponse.json(validationErrorResponse(['Invalid transaction ID']), { status: 400 });

    const result = await deleteTransaction(userId, transactionId);

    if (!result.success) {
      if (result.error === 'Transaction not found') {
        return NextResponse.json(notFoundResponse('Transaction'), { status: 404 });
      }
      return NextResponse.json(
        validationErrorResponse([result.error || 'Failed to delete transaction']),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(null, 'Transaction deleted successfully')
    );
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
