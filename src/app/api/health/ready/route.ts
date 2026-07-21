import { errorResponse, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const GLOBAL_SMTP_ID = 1;
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(): Promise<Response> {
  try {
    const [, smtpSettings] = await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      prisma.applicationSmtpSettings.findUnique({
        where: { id: GLOBAL_SMTP_ID },
        select: { id: true },
      }),
    ]);

    if (!smtpSettings) {
      logDependencyFailure();
      return unavailableResponse();
    }

    return Response.json(successResponse({ status: 'ok' }, 'Ready'), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch {
    logDependencyFailure();
    return unavailableResponse();
  }
}

function logDependencyFailure(): void {
  // Keep dependency and credential details out of logs for this public probe.
  console.error('Readiness dependency check failed');
}

function unavailableResponse(): Response {
  return Response.json(
    errorResponse('Service unavailable', 503, { status: 'unavailable' }),
    { status: 503, headers: NO_STORE_HEADERS }
  );
}
