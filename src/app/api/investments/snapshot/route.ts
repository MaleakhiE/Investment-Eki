/**
 * Investment Snapshot API Route
 * 
 * POST /api/investments/snapshot - Create or update investment snapshot
 * 
 * Requirements: 3.2, 3.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { saveSnapshot } from '@/services/investment.service';
import { validateSnapshotInput, InvestmentSnapshotInput } from '@/lib/validation';
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  serverErrorResponse,
} from '@/lib/api-response';

/**
 * POST /api/investments/snapshot - Create or update investment snapshot
 * Requirements: 3.2, 3.5
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    let body: InvestmentSnapshotInput;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        validationErrorResponse(['Invalid JSON body']),
        { status: 400 }
      );
    }

    // Validate input
    const validation = validateSnapshotInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        validationErrorResponse(validation.errors),
        { status: 400 }
      );
    }

    // Save snapshot (upsert)
    const result = await saveSnapshot(userId, body);

    if (!result.success) {
      return NextResponse.json(
        validationErrorResponse([result.error || 'Failed to save snapshot']),
        { status: 400 }
      );
    }

    // Convert bigint to string for JSON serialization
    const snapshotResponse = {
      ...result.snapshot!,
      id: result.snapshot!.id.toString(),
      investment_id: result.snapshot!.investment_id.toString(),
    };

    return NextResponse.json(
      successResponse(snapshotResponse, 'Investment snapshot saved successfully'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving investment snapshot:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
