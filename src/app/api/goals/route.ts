import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { responseAPI } from '@/lib/api-response';
import { createGoal, getGoals, getGoalsSummary } from '@/services/goals.service';
import { FinancialInputError } from '@/lib/financial-input';
import { safeDatabaseErrorCode } from '@/lib/error-safety';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(responseAPI(401, 'ERROR', 'Unauthorized', null), { status: 401 });
    }

    const url = new URL(request.url);
    const summaryOnly = url.searchParams.get('summary') === 'true';

    if (summaryOnly) {
      const summary = await getGoalsSummary(userId);
      return NextResponse.json(responseAPI(200, 'SUCCESS', 'Goals summary retrieved', summary));
    }

    const goals = await getGoals(userId);
    return NextResponse.json(responseAPI(200, 'SUCCESS', 'Goals retrieved', goals));
  } catch (error) {
    console.error('Get goals error:', { code: safeDatabaseErrorCode(error) });
    return NextResponse.json(responseAPI(500, 'ERROR', 'Internal server error', null), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(responseAPI(401, 'ERROR', 'Unauthorized', null), { status: 401 });
    }

    const body = await request.json();

    if (!body.name || !body.target_amount || !body.category) {
      return NextResponse.json(responseAPI(400, 'ERROR', 'Name, target amount, and category required', null), { status: 400 });
    }

    const goal = await createGoal(userId, {
      name: body.name,
      target_amount: body.target_amount,
      current_amount: body.current_amount,
      deadline: body.deadline,
      category: body.category,
      priority: body.priority,
    });

    return NextResponse.json(responseAPI(201, 'SUCCESS', 'Goal created', goal), { status: 201 });
  } catch (error) {
    if (error instanceof FinancialInputError) {
      return NextResponse.json(responseAPI(400, 'ERROR', error.message, null), { status: 400 });
    }
    console.error('Create goal error:', { code: safeDatabaseErrorCode(error) });
    return NextResponse.json(responseAPI(500, 'ERROR', 'Internal server error', null), { status: 500 });
  }
}
