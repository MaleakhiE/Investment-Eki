/**
 * Investment Snapshot Detail API Route
 * 
 * DELETE /api/investments/snapshot/[id] - Delete investment snapshot
 * 
 * Requirements: 3.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { deleteSnapshot } from '@/services/investment.service';
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-response';
import { parseDatabaseId } from '@/lib/database-id';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function safeDatabaseErrorCode(error: unknown): string {
  if (
    typeof error === 'object'
    && error !== null
    && 'code' in error
    && typeof error.code === 'string'
    && /^P\d{4}$/.test(error.code)
  ) return error.code;
  return 'UNCLASSIFIED';
}

/**
 * DELETE /api/investments/snapshot/[id] - Delete investment snapshot
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { id } = await params;
    const snapshotId = parseDatabaseId(id);
    if (!snapshotId) {
      return NextResponse.json(validationErrorResponse(['Invalid snapshot ID']), { status: 400 });
    }

    const result = await deleteSnapshot(userId, snapshotId);

    if (!result.success) {
      if (result.error === 'NOT_FOUND') {
        return NextResponse.json(notFoundResponse('Snapshot not found'), { status: 404 });
      }
      return NextResponse.json(serverErrorResponse(), { status: 500 });
    }

    return NextResponse.json(
      successResponse(null, 'Snapshot deleted successfully')
    );
  } catch (error) {
    console.error('Error deleting snapshot:', { code: safeDatabaseErrorCode(error) });
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
