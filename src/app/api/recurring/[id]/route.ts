import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { responseAPI } from '@/lib/api-response';
import { updateRecurring, deleteRecurring, RecurringInputError } from '@/services/recurring.service';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(responseAPI(401, 'ERROR', 'Unauthorized', null), { status: 401 });
    }

    const { id } = await params;
    const userId = BigInt(session.user.id);
    const recurringId = BigInt(id);
    const body = await request.json();

    const success = await updateRecurring(userId, recurringId, body);

    if (!success) {
      return NextResponse.json(responseAPI(404, 'ERROR', 'Recurring transaction not found', null), { status: 404 });
    }

    return NextResponse.json(responseAPI(200, 'SUCCESS', 'Recurring transaction updated', null));
  } catch (error) {
    if (error instanceof RecurringInputError) {
      return NextResponse.json(responseAPI(400, 'ERROR', error.message, null), { status: 400 });
    }
    console.error('Update recurring error:', error);
    return NextResponse.json(responseAPI(500, 'ERROR', 'Internal server error', null), { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(responseAPI(401, 'ERROR', 'Unauthorized', null), { status: 401 });
    }

    const { id } = await params;
    const userId = BigInt(session.user.id);
    const recurringId = BigInt(id);

    await deleteRecurring(userId, recurringId);

    return NextResponse.json(responseAPI(200, 'SUCCESS', 'Recurring transaction deleted', null));
  } catch (error) {
    console.error('Delete recurring error:', error);
    return NextResponse.json(responseAPI(500, 'ERROR', 'Internal server error', null), { status: 500 });
  }
}
