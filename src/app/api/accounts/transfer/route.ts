import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { createTransfer, type TransferInput } from '@/services/transaction.service';
import { serverErrorResponse, successResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/api-response';
import { safeDatabaseErrorCode } from '@/lib/error-safety';

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json(unauthorizedResponse(), { status: 401 });

    let body: TransferInput;
    try { body = await request.json(); }
    catch { return NextResponse.json(validationErrorResponse(['Invalid JSON body']), { status: 400 }); }

    const result = await createTransfer(userId, body);
    if (!result.success || !result.transaction) {
      return NextResponse.json(validationErrorResponse([result.error || 'Failed to transfer funds']), { status: 400 });
    }

    const { user_id: internalUserId, ...transaction } = result.transaction;
    void internalUserId;
    const serialized = {
      ...transaction,
      id: transaction.id.toString(),
      account_id: transaction.account_id?.toString() ?? null,
      destination_account_id: transaction.destination_account_id?.toString() ?? null,
    };
    return NextResponse.json(
      successResponse(serialized, 'Transfer created successfully', 201),
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating transfer:', { code: safeDatabaseErrorCode(error) });
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
