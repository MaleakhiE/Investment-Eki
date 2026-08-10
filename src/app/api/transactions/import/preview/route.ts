import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { safeDatabaseErrorCode } from '@/lib/error-safety';
import { successResponse, unauthorizedResponse, validationErrorResponse, serverErrorResponse } from '@/lib/api-response';
import { previewTransactionCsv } from '@/services/transaction-import.service';

export async function POST(request: NextRequest) {
  try {
    if (!(await getCurrentUserId())) return NextResponse.json(unauthorizedResponse(), { status: 401 });
    const body = await request.json().catch(() => null) as { csv?: unknown } | null;
    if (!body || typeof body.csv !== 'string') {
      return NextResponse.json(validationErrorResponse(['csv must be a UTF-8 string']), { status: 400 });
    }
    const preview = previewTransactionCsv(body.csv);
    if ('errors' in preview) return NextResponse.json(validationErrorResponse(preview.errors), { status: 400 });
    return NextResponse.json(successResponse(preview, 'Transaction import preview created'));
  } catch (error) {
    console.error('Error previewing transaction import:', { code: safeDatabaseErrorCode(error) });
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
