import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { responseAPI } from '@/lib/api-response';
import { createOrUpdateBudget, getBudgets, getBudgetAlerts } from '@/services/budget.service';
import { FinancialInputError } from '@/lib/financial-input';
import { safeDatabaseErrorCode } from '@/lib/error-safety';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(responseAPI(401, 'ERROR', 'Unauthorized', null), { status: 401 });
    }

    const url = new URL(request.url);
    const alertsOnly = url.searchParams.get('alerts') === 'true';

    const budgets = alertsOnly ? await getBudgetAlerts(userId) : await getBudgets(userId);

    return NextResponse.json(responseAPI(200, 'SUCCESS', 'Budgets retrieved', budgets));
  } catch (error) {
    console.error('Get budgets error:', { code: safeDatabaseErrorCode(error) });
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

    if (!body.category || body.amount === undefined) {
      return NextResponse.json(responseAPI(400, 'ERROR', 'Category and amount required', null), { status: 400 });
    }

    const budget = await createOrUpdateBudget(userId, {
      category: body.category,
      amount: body.amount,
      period: body.period,
    });

    return NextResponse.json(responseAPI(200, 'SUCCESS', 'Budget saved', budget));
  } catch (error) {
    if (error instanceof FinancialInputError) {
      return NextResponse.json(responseAPI(400, 'ERROR', error.message, null), { status: 400 });
    }
    console.error('Create budget error:', { code: safeDatabaseErrorCode(error) });
    return NextResponse.json(responseAPI(500, 'ERROR', 'Internal server error', null), { status: 500 });
  }
}
