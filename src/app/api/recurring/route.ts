import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { responseAPI } from '@/lib/api-response';
import { createRecurring, getRecurrings, processRecurrings, RecurringInputError } from '@/services/recurring.service';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(responseAPI(401, 'ERROR', 'Unauthorized', null), { status: 401 });
    }

    const recurrings = await getRecurrings(userId);

    return NextResponse.json(responseAPI(200, 'SUCCESS', 'Recurring transactions retrieved', recurrings));
  } catch (error) {
    console.error('Get recurring error:', error);
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

    // Check if this is a process request
    if (body.action === 'process') {
      const created = await processRecurrings(userId);
      return NextResponse.json(responseAPI(200, 'SUCCESS', `Processed ${created.length} recurring transactions`, { created }));
    }

    if (!body.type || !body.category || !body.amount || !body.frequency || !body.start_date) {
      return NextResponse.json(responseAPI(400, 'ERROR', 'Missing required fields', null), { status: 400 });
    }

    const recurring = await createRecurring(userId, {
      type: body.type,
      category: body.category,
      description: body.description || '',
      amount: body.amount,
      frequency: body.frequency,
      day_of_month: body.day_of_month,
      day_of_week: body.day_of_week,
      month_of_year: body.month_of_year,
      account_id: body.account_id,
      start_date: body.start_date,
      end_date: body.end_date,
    });

    return NextResponse.json(responseAPI(201, 'SUCCESS', 'Recurring transaction created', recurring), { status: 201 });
  } catch (error) {
    if (error instanceof RecurringInputError) {
      return NextResponse.json(responseAPI(400, 'ERROR', error.message, null), { status: 400 });
    }
    console.error('Create recurring error:', error);
    return NextResponse.json(responseAPI(500, 'ERROR', 'Internal server error', null), { status: 500 });
  }
}
