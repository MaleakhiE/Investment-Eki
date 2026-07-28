import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { responseAPI, validationErrorResponse } from '@/lib/api-response';
import { isJsonObject, parseRecurringId } from '@/lib/recurring-route-input';
import {
  updateRecurring,
  deleteRecurring,
  getSafeRecurringErrorCode,
  type RecurringInput,
  RecurringInputError,
} from '@/services/recurring.service';

const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(responseAPI(401, 'ERROR', 'Unauthorized', null), {
        status: 401,
        headers: PRIVATE_NO_STORE_HEADERS,
      });
    }

    const { id } = await params;
    const recurringId = parseRecurringId(id);
    if (!recurringId) {
      return NextResponse.json(validationErrorResponse(['Invalid recurring ID']), {
        status: 400,
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
    const body = parsedBody as Partial<RecurringInput> & { is_active?: boolean };

    const success = await updateRecurring(userId, recurringId, body);

    if (!success) {
      return NextResponse.json(responseAPI(404, 'ERROR', 'Recurring transaction not found', null), {
        status: 404,
        headers: PRIVATE_NO_STORE_HEADERS,
      });
    }

    return NextResponse.json(responseAPI(200, 'SUCCESS', 'Recurring transaction updated', null), {
      headers: PRIVATE_NO_STORE_HEADERS,
    });
  } catch (error) {
    if (error instanceof RecurringInputError) {
      return NextResponse.json(responseAPI(400, 'ERROR', error.message, null), {
        status: 400,
        headers: PRIVATE_NO_STORE_HEADERS,
      });
    }
    console.error('Recurring update failed', { code: getSafeRecurringErrorCode(error) });
    return NextResponse.json(responseAPI(500, 'ERROR', 'Internal server error', null), {
      status: 500,
      headers: PRIVATE_NO_STORE_HEADERS,
    });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(responseAPI(401, 'ERROR', 'Unauthorized', null), {
        status: 401,
        headers: PRIVATE_NO_STORE_HEADERS,
      });
    }

    const { id } = await params;
    const recurringId = parseRecurringId(id);
    if (!recurringId) {
      return NextResponse.json(validationErrorResponse(['Invalid recurring ID']), {
        status: 400,
        headers: PRIVATE_NO_STORE_HEADERS,
      });
    }

    await deleteRecurring(userId, recurringId);

    return NextResponse.json(responseAPI(200, 'SUCCESS', 'Recurring transaction deleted', null), {
      headers: PRIVATE_NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error('Recurring delete failed', { code: getSafeRecurringErrorCode(error) });
    return NextResponse.json(responseAPI(500, 'ERROR', 'Internal server error', null), {
      status: 500,
      headers: PRIVATE_NO_STORE_HEADERS,
    });
  }
}
