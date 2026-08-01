/**
 * Transaction Summary by Date Range API Route
 * 
 * GET /api/transactions/summary-range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Get summary for a custom date range (for salary period calculation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { safeDatabaseErrorCode } from '@/lib/error-safety';
import { prisma } from '@/lib/prisma';
import { decryptNumber } from '@/lib/encryption';
import { parseCalendarDate } from '@/lib/financial-input';
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

    // Validate date format and calendar correctness
    const parsedStart = parseCalendarDate(startDate);
    const parsedEnd = parseCalendarDate(endDate);

    if (!parsedStart || !parsedEnd) {
      return NextResponse.json(
        validationErrorResponse(['Invalid date format or impossible calendar date. Use YYYY-MM-DD']),
        { status: 400 }
      );
    }

    if (parsedStart > parsedEnd) {
      return NextResponse.json(
        validationErrorResponse(['startDate must not be after endDate']),
        { status: 400 }
      );
    }

    const records = await prisma.transaction.findMany({
      where: {
        user_id: userId,
        date: {
          gte: parsedStart,
          lte: parsedEnd,
        },
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const expenseByCategory = new Map<string, number>();

    for (const record of records) {
      const amount = decryptNumber(record.amount);
      
      if (record.type === 'INCOME') {
        totalIncome += amount;
      } else if (record.type === 'EXPENSE') {
        totalExpense += amount;
        expenseByCategory.set(record.category, (expenseByCategory.get(record.category) ?? 0) + amount);
      }
    }

    const summary = {
      period: `${startDate} to ${endDate}`,
      total_income: totalIncome,
      total_expense: totalExpense,
      net_cashflow: totalIncome - totalExpense,
      expense_by_category: Object.fromEntries(expenseByCategory),
    };

    return NextResponse.json(
      successResponse(summary, 'Summary retrieved successfully')
    );
  } catch (error) {
    console.error('Error getting summary:', { code: safeDatabaseErrorCode(error) });
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
