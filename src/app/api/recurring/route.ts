import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { responseAPI, validationErrorResponse } from '@/lib/api-response';
import { isJsonObject } from '@/lib/recurring-route-input';
import {
  createRecurring,
  getRecurrings,
  getSafeRecurringErrorCode,
  processRecurrings,
  type RecurringInput,
  RecurringInputError,
} from '@/services/recurring.service';

const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
};

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(responseAPI(401, 'ERROR', 'Unauthorized', null), {
        status: 401,
        headers: PRIVATE_NO_STORE_HEADERS,
      });
    }

    const recurrings = await getRecurrings(userId);

    return NextResponse.json(
      responseAPI(200, 'SUCCESS', 'Recurring transactions retrieved', recurrings),
      { headers: PRIVATE_NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error('Recurring list failed', { code: getSafeRecurringErrorCode(error) });
    return NextResponse.json(responseAPI(500, 'ERROR', 'Internal server error', null), {
      status: 500,
      headers: PRIVATE_NO_STORE_HEADERS,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(responseAPI(401, 'ERROR', 'Unauthorized', null), {
        status: 401,
        headers: PRIVATE_NO_STORE_HEADERS,
      });
    }

    let parsedBody: unknown;
    try {
      parsedBody = await request.json();
    } catch {
      return NextResponse.json(validationErrorResponse(['Invalid JSON body']), {
        status: 400,
        headers: PRIVATE_NO_STORE_HEADERS,
      });
    }
    if (!isJsonObject(parsedBody)) {
      return NextResponse.json(validationErrorResponse(['Invalid JSON body']), {
        status: 400,
        headers: PRIVATE_NO_STORE_HEADERS,
      });
    }
    const body = parsedBody as Partial<RecurringInput> & { action?: unknown };

    // Check if this is a process request
    if (body.action === 'process') {
      const created = await processRecurrings(userId);
      return NextResponse.json(
        responseAPI(200, 'SUCCESS', `Processed ${created.length} recurring transactions`, { created }),
        { headers: PRIVATE_NO_STORE_HEADERS },
      );
    }

    if (!body.type || !body.category || !body.amount || !body.frequency || !body.start_date) {
      return NextResponse.json(responseAPI(400, 'ERROR', 'Missing required fields', null), {
        status: 400,
        headers: PRIVATE_NO_STORE_HEADERS,
      });
    }

    const recurring = await createRecurring(userId, {
      type: body.type,
      category: body.category,
      description: body.description ?? '',
      amount: body.amount,
      frequency: body.frequency,
      day_of_month: body.day_of_month,
      day_of_week: body.day_of_week,
      month_of_year: body.month_of_year,
      account_id: body.account_id,
      start_date: body.start_date,
      end_date: body.end_date,
    });

    return NextResponse.json(responseAPI(201, 'SUCCESS', 'Recurring transaction created', recurring), {
      status: 201,
      headers: PRIVATE_NO_STORE_HEADERS,
    });
  } catch (error) {
    if (error instanceof RecurringInputError) {
      return NextResponse.json(responseAPI(400, 'ERROR', error.message, null), {
        status: 400,
        headers: PRIVATE_NO_STORE_HEADERS,
      });
    }
    console.error('Recurring create or process failed', {
      code: getSafeRecurringErrorCode(error),
    });
    return NextResponse.json(responseAPI(500, 'ERROR', 'Internal server error', null), {
      status: 500,
      headers: PRIVATE_NO_STORE_HEADERS,
    });
  }
}
