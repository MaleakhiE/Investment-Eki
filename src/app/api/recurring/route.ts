import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { responseAPI } from '@/lib/api-response';
import { createRecurring, getRecurrings, processRecurrings } from '@/services/recurring.service';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(responseAPI(401, 'ERROR', 'Unauthorized', null), { status: 401 });
    }

    const userId = BigInt(session.user.id);
    const recurrings = await getRecurrings(userId);

    return NextResponse.json(responseAPI(200, 'SUCCESS', 'Recurring transactions retrieved', recurrings));
  } catch (error) {
    console.error('Get recurring error:', error);
    return NextResponse.json(responseAPI(500, 'ERROR', 'Internal server error', null), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(responseAPI(401, 'ERROR', 'Unauthorized', null), { status: 401 });
    }

    const userId = BigInt(session.user.id);
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
      start_date: body.start_date,
      end_date: body.end_date,
    });

    return NextResponse.json(responseAPI(201, 'SUCCESS', 'Recurring transaction created', recurring), { status: 201 });
  } catch (error) {
    console.error('Create recurring error:', error);
    return NextResponse.json(responseAPI(500, 'ERROR', 'Internal server error', null), { status: 500 });
  }
}
