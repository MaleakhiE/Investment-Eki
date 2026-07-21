import { successResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(): Promise<Response> {
  return Response.json(successResponse({ status: 'ok' }, 'Live'), {
    status: 200,
    headers: NO_STORE_HEADERS,
  });
}
