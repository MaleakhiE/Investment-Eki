/**
 * Transaction Summary by Date Range API Route
 * 
 * GET /api/transactions/summary-range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Get summary for a custom date range (for salary period calculation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptNumber } from '@/lib/encryption';
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  serverErrorResponse,
} from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        validationErrorResponse(['startDate and endDate are required']),
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return NextResponse.json(
        validationErrorResponse(['Invalid date format. Use YYYY-MM-DD']),
        { status: 400 }
      );
    }

    const records = await prisma.transaction.findMany({
      where: {
        user_id: userId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const expenseByCategory: Record<string, number> = {};

    for (const record of records) {
      const amount = decryptNumber(record.amount);
      
      if (record.type === 'INCOME') {
        totalIncome += amount;
      } else if (record.type === 'EXPENSE') {
        totalExpense += amount;
        expenseByCategory[record.category] = (expenseByCategory[record.category] || 0) + amount;
      }
    }

    const summary = {
      period: `${startDate} to ${endDate}`,
      total_income: totalIncome,
      total_expense: totalExpense,
      net_cashflow: totalIncome - totalExpense,
      expense_by_category: expenseByCategory,
    };

    return NextResponse.json(
      successResponse(summary, 'Summary retrieved successfully')
    );
  } catch (error) {
    console.error('Error getting summary:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
