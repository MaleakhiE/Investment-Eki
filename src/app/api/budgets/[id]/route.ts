import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { responseAPI } from '@/lib/api-response';
import { deleteBudget } from '@/services/budget.service';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(responseAPI(401, 'ERROR', 'Unauthorized', null), { status: 401 });
    }

    const { id } = await params;
    const userId = BigInt(session.user.id);
    const budgetId = BigInt(id);

    await deleteBudget(userId, budgetId);

    return NextResponse.json(responseAPI(200, 'SUCCESS', 'Budget deleted', null));
  } catch (error) {
    console.error('Delete budget error:', error);
    return NextResponse.json(responseAPI(500, 'ERROR', 'Internal server error', null), { status: 500 });
  }
}
