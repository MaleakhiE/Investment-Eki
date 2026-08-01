import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { responseAPI, validationErrorResponse } from '@/lib/api-response';
import { deleteBudget } from '@/services/budget.service';
import { parseDatabaseId } from '@/lib/database-id';

function safeDatabaseErrorCode(error: unknown): string {
  if (
    typeof error === 'object'
    && error !== null
    && 'code' in error
    && typeof error.code === 'string'
    && /^P\d{4}$/.test(error.code)
  ) return error.code;
  return 'UNCLASSIFIED';
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(responseAPI(401, 'ERROR', 'Unauthorized', null), { status: 401 });
    }

    const { id } = await params;
    const budgetId = parseDatabaseId(id);
    if (!budgetId) {
      return NextResponse.json(validationErrorResponse(['Invalid budget ID']), { status: 400 });
    }

    await deleteBudget(userId, budgetId);

    return NextResponse.json(responseAPI(200, 'SUCCESS', 'Budget deleted', null));
  } catch (error) {
    console.error('Delete budget error:', { code: safeDatabaseErrorCode(error) });
    return NextResponse.json(responseAPI(500, 'ERROR', 'Internal server error', null), { status: 500 });
  }
}
