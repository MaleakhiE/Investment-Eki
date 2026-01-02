/**
 * Investments API Route
 * 
 * GET /api/investments - List all investments for the user
 * 
 * Requirements: 3.4
 */

import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';

/**
 * GET /api/investments - List all investments for the user
 * Requirements: 3.4
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const investments = await prisma.investment.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    // Convert bigint to string for JSON serialization
    const investmentsResponse = investments.map((investment) => ({
      id: investment.id.toString(),
      user_id: investment.user_id.toString(),
      type: investment.type,
      created_at: investment.created_at,
    }));

    return NextResponse.json(
      successResponse(investmentsResponse, 'Investments retrieved successfully')
    );
  } catch (error) {
    console.error('Error getting investments:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
