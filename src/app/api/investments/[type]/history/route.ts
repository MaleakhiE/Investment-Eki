/**
 * Investment History by Type API Route
 * 
 * GET /api/investments/[type]/history - Get snapshots by investment type
 * 
 * Requirements: 3.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { safeDatabaseErrorCode } from '@/lib/error-safety';
import { getSnapshotsByUserAndType } from '@/services/investment.service';
import { validateInvestmentType, InvestmentType } from '@/lib/validation';
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  serverErrorResponse,
} from '@/lib/api-response';

interface RouteParams {
  params: Promise<{ type: string }>;
}

/**
 * GET /api/investments/[type]/history - Get snapshots by investment type
 * Requirements: 3.4
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { type } = await params;

    // Validate investment type
    const typeValidation = validateInvestmentType(type);
    if (!typeValidation.valid) {
      return NextResponse.json(
        validationErrorResponse(typeValidation.errors),
        { status: 400 }
      );
    }

    const snapshots = await getSnapshotsByUserAndType(userId, type as InvestmentType);

    // Convert bigint to string for JSON serialization
    const snapshotsResponse = snapshots.map((snapshot) => ({
      ...snapshot,
      id: snapshot.id.toString(),
      investment_id: snapshot.investment_id.toString(),
    }));

    return NextResponse.json(
      successResponse(snapshotsResponse, `${type} investment history retrieved successfully`)
    );
  } catch (error) {
    console.error('Error getting investment history:', { code: safeDatabaseErrorCode(error) });
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
