import { NextResponse } from 'next/server';
import { responseAPI } from '@/lib/api-response';
import { verifyCronBearer } from '@/lib/cron-auth';
import { processAllDueRecurrings } from '@/services/recurring.service';

export async function POST(request: Request) {
  if (!verifyCronBearer(request)) {
    return NextResponse.json(responseAPI(401, 'ERROR', 'Invalid cron credentials', null), { status: 401 });
  }

  try {
    const result = await processAllDueRecurrings(new Date());
    return NextResponse.json(responseAPI(200, 'SUCCESS', 'Recurring transactions processed', result));
  } catch (error) {
    console.error('Recurring scheduler failed:', error);
    return NextResponse.json(responseAPI(500, 'ERROR', 'Internal server error', null), { status: 500 });
  }
}
