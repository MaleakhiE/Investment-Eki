import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { responseAPI } from '@/lib/api-response';
import { updateGoal, addToGoal, deleteGoal } from '@/services/goals.service';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(responseAPI(401, 'ERROR', 'Unauthorized', null), { status: 401 });
    }

    const { id } = await params;
    const goalId = BigInt(id);
    const body = await request.json();

    // Check if this is an "add amount" request
    if (body.add_amount !== undefined) {
      const goal = await addToGoal(userId, goalId, body.add_amount);
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
    console.error('Update goal error:', error);
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
    const goalId = BigInt(id);

    await deleteGoal(userId, goalId);

    return NextResponse.json(responseAPI(200, 'SUCCESS', 'Goal deleted', null));
  } catch (error) {
    console.error('Delete goal error:', error);
    return NextResponse.json(responseAPI(500, 'ERROR', 'Internal server error', null), { status: 500 });
  }
}
