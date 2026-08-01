/**
 * Investment Details API Route
 * 
 * GET /api/investments/details - Get detailed investment info with platform and product names
 */

import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { safeDatabaseErrorCode } from '@/lib/error-safety';
import { prisma } from '@/lib/prisma';
import { decryptNumber } from '@/lib/encryption';
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';

interface InvestmentDetail {
  type: string;
  platform: string;
  product_name: string;
  invested_amount: number;
  current_value: number;
  gain_loss: number;
  gain_loss_percent: number;
  units?: string;
  nav_per_unit?: string;
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    // Get all investments with their latest snapshots
    const investments = await prisma.investment.findMany({
      where: { user_id: userId },
      include: {
        snapshots: {
          orderBy: { month: 'desc' },
          take: 1,
        },
      },
    });

    const details: InvestmentDetail[] = [];

    for (const investment of investments) {
      if (investment.snapshots.length > 0) {
        const snapshot = investment.snapshots[0];
        const investedAmount = decryptNumber(snapshot.invested_amount);
        const currentValue = decryptNumber(snapshot.current_value);
        const gainLoss = currentValue - investedAmount;
        const gainLossPercent = investedAmount > 0 ? (gainLoss / investedAmount) * 100 : 0;

        details.push({
          type: investment.type,
          platform: snapshot.platform || (investment.type === 'GOLD' ? 'Gold Investment' : 'Mutual Fund'),
          product_name: snapshot.product_name || (investment.type === 'GOLD' ? 'Physical Gold' : 'Fund'),
          invested_amount: investedAmount,
          current_value: currentValue,
          gain_loss: gainLoss,
          gain_loss_percent: gainLossPercent,
          units: snapshot.units || undefined,
          nav_per_unit: snapshot.nav_per_unit || undefined,
        });
      }
    }

    return NextResponse.json(
      successResponse(details, 'Investment details retrieved successfully')
    );
  } catch (error) {
    console.error('Error getting investment details:', { code: safeDatabaseErrorCode(error) });
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
