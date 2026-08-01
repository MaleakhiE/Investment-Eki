import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { responseAPI, validationErrorResponse } from '@/lib/api-response';
import {
  InvalidGoalAmountError,
  updateGoal,
  addToGoal,
  deleteGoal,
} from '@/services/goals.service';
import { FinancialInputError, isFinitePositiveAmount } from '@/lib/financial-input';
import { parseDatabaseId } from '@/lib/database-id';

function safeDatabaseErrorCode(error: unknown): string {
  if (
    typeof error === 'object'
    && error !== null
    && 'code' in error
    && typeof error.code === 'string'
    && /^P\d{4}$/.test(error.code)
  ) {
    return error.code;
  }
  return 'UNCLASSIFIED';
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(responseAPI(401, 'ERROR', 'Unauthorized', null), { status: 401 });
    }

    const { id } = await params;
    const goalId = parseDatabaseId(id);
    if (!goalId) {
      return NextResponse.json(validationErrorResponse(['Invalid goal ID']), { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(validationErrorResponse(['Invalid JSON body']), { status: 400 });
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json(validationErrorResponse(['Invalid JSON body']), { status: 400 });
    }

    // Check if this is an "add amount" request
    if ('add_amount' in body) {
      const addAmount = body.add_amount;
      if (!isFinitePositiveAmount(addAmount)) {
        return NextResponse.json(
          validationErrorResponse(['add_amount must be a finite positive number']),
          { status: 400 },
        );
      }

      const goal = await addToGoal(userId, goalId, addAmount);
      if (!goal) {
        return NextResponse.json(responseAPI(404, 'ERROR', 'Goal not found', null), { status: 404 });
      }
      return NextResponse.json(responseAPI(200, 'SUCCESS', 'Amount added to goal', goal));
    }

    const goal = await updateGoal(userId, goalId, body);

    if (!goal) {
      return NextResponse.json(responseAPI(404, 'ERROR', 'Goal not found', null), { status: 404 });
    }

    return NextResponse.json(responseAPI(200, 'SUCCESS', 'Goal updated', goal));
  } catch (error) {
    if (error instanceof FinancialInputError && !(error instanceof InvalidGoalAmountError)) {
      return NextResponse.json(validationErrorResponse([error.message]), { status: 400 });
    }
    if (error instanceof InvalidGoalAmountError) {
      return NextResponse.json(
        validationErrorResponse(['add_amount produces an invalid goal balance']),
        { status: 400 },
      );
    }
    console.error('Update goal error:', { code: safeDatabaseErrorCode(error) });
    return NextResponse.json(responseAPI(500, 'ERROR', 'Internal server error', null), { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(responseAPI(401, 'ERROR', 'Unauthorized', null), { status: 401 });
    }

    const { id } = await params;
    const goalId = parseDatabaseId(id);
    if (!goalId) {
      return NextResponse.json(validationErrorResponse(['Invalid goal ID']), { status: 400 });
    }

    await deleteGoal(userId, goalId);

    return NextResponse.json(responseAPI(200, 'SUCCESS', 'Goal deleted', null));
  } catch (error) {
    console.error('Delete goal error:', { code: safeDatabaseErrorCode(error) });
    return NextResponse.json(responseAPI(500, 'ERROR', 'Internal server error', null), { status: 500 });
  }
}
