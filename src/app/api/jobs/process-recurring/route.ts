import { NextResponse } from 'next/server';
import { responseAPI } from '@/lib/api-response';
import { verifyCronBearer } from '@/lib/cron-auth';
import {
  getSafeRecurringErrorCode,
  processAllDueRecurrings,
} from '@/services/recurring.service';

const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
};

export async function POST(request: Request) {
  if (!verifyCronBearer(request)) {
    return NextResponse.json(
      responseAPI(401, 'ERROR', 'Invalid cron credentials', null),
      { status: 401, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }

  try {
    const result = await processAllDueRecurrings(new Date());
    return NextResponse.json(
      responseAPI(200, 'SUCCESS', 'Recurring transactions processed', {
        created: result.created,
        skipped: result.skipped,
        failed: result.failed,
      }),
      { headers: PRIVATE_NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error('Recurring scheduler failed', {
      code: getSafeRecurringErrorCode(error),
    });
    return NextResponse.json(
      responseAPI(500, 'ERROR', 'Internal server error', null),
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }
}
