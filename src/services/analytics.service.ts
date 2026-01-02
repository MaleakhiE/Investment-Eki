/**
 * Analytics Service
 * 
 * Provides analytics and insights functionality including:
 * - Portfolio aggregation (total invested vs current value)
 * - Investment comparison (Gold vs Mutual Fund)
 * - Cashflow trend analytics
 * - Portfolio growth over time
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { prisma } from '@/lib/prisma';
import { decryptNumber } from '@/lib/encryption';
import { InvestmentType } from '@/lib/validation';

/**
 * Cashflow trend data point
 */
export interface CashflowTrend {
  month: string;
  net_cashflow: number;
}

/**
 * Portfolio summary with aggregated values
 */
export interface PortfolioSummary {
  total_invested: number;
  total_current_value: number;
  total_gain_loss: number;
}

/**
 * Investment comparison between Gold and Mutual Fund
 */
export interface InvestmentComparison {
  gold: PortfolioSummary;
  mutual_fund: PortfolioSummary;
}

/**
 * Portfolio growth data point
 */
export interface PortfolioGrowthPoint {
  month: string;
  total_invested: number;
  total_current_value: number;
  gain_loss: number;
}


/**
 * Get portfolio summary for a user
 * Aggregates total invested, current value, and gain/loss across all investments
 * 
 * Requirements: 4.2
 */
export async function getPortfolioSummary(userId: bigint): Promise<PortfolioSummary> {
  // Get all investments for the user
  const investments = await prisma.investment.findMany({
    where: { user_id: userId },
    include: {
      snapshots: {
        orderBy: { month: 'desc' },
        take: 1, // Get only the latest snapshot for each investment
      },
    },
  });

  let totalInvested = 0;
  let totalCurrentValue = 0;

  for (const investment of investments) {
    if (investment.snapshots.length > 0) {
      const latestSnapshot = investment.snapshots[0];
      totalInvested += decryptNumber(latestSnapshot.invested_amount);
      totalCurrentValue += decryptNumber(latestSnapshot.current_value);
    }
  }

  return {
    total_invested: totalInvested,
    total_current_value: totalCurrentValue,
    total_gain_loss: totalCurrentValue - totalInvested,
  };
}

/**
 * Get investment comparison between Gold and Mutual Fund
 * Returns separate summaries for each investment type
 * 
 * Requirements: 4.4
 */
export async function getInvestmentComparison(userId: bigint): Promise<InvestmentComparison> {
  const goldSummary = await getPortfolioSummaryByType(userId, 'GOLD');
  const mutualFundSummary = await getPortfolioSummaryByType(userId, 'MUTUAL_FUND');

  return {
    gold: goldSummary,
    mutual_fund: mutualFundSummary,
  };
}

/**
 * Get portfolio summary for a specific investment type
 * Helper function for investment comparison
 */
async function getPortfolioSummaryByType(
  userId: bigint,
  type: InvestmentType
): Promise<PortfolioSummary> {
  const investment = await prisma.investment.findUnique({
    where: {
      user_id_type: {
        user_id: userId,
        type: type,
      },
    },
    include: {
      snapshots: {
        orderBy: { month: 'desc' },
        take: 1, // Get only the latest snapshot
      },
    },
  });

  if (!investment || investment.snapshots.length === 0) {
    return {
      total_invested: 0,
      total_current_value: 0,
      total_gain_loss: 0,
    };
  }

  const latestSnapshot = investment.snapshots[0];
  const investedAmount = decryptNumber(latestSnapshot.invested_amount);
  const currentValue = decryptNumber(latestSnapshot.current_value);

  return {
    total_invested: investedAmount,
    total_current_value: currentValue,
    total_gain_loss: currentValue - investedAmount,
  };
}


/**
 * Get cashflow trend for a user
 * Returns monthly net_cashflow data ordered by month
 * 
 * Requirements: 4.1
 */
export async function getCashflowTrend(userId: bigint): Promise<CashflowTrend[]> {
  const cashflows = await prisma.monthlyCashflow.findMany({
    where: { user_id: userId },
    orderBy: { month: 'asc' },
  });

  return cashflows.map((record) => ({
    month: record.month,
    net_cashflow: decryptNumber(record.net_cashflow),
  }));
}

/**
 * Get portfolio growth over time for a user
 * Returns monthly aggregated investment values
 * 
 * Requirements: 4.3
 */
export async function getPortfolioGrowth(userId: bigint): Promise<PortfolioGrowthPoint[]> {
  // Get all snapshots for the user's investments
  const investments = await prisma.investment.findMany({
    where: { user_id: userId },
    include: {
      snapshots: {
        orderBy: { month: 'asc' },
      },
    },
  });

  // Aggregate snapshots by month
  const monthlyData = new Map<string, { invested: number; current: number }>();

  for (const investment of investments) {
    for (const snapshot of investment.snapshots) {
      const invested = decryptNumber(snapshot.invested_amount);
      const current = decryptNumber(snapshot.current_value);

      const existing = monthlyData.get(snapshot.month) || { invested: 0, current: 0 };
      monthlyData.set(snapshot.month, {
        invested: existing.invested + invested,
        current: existing.current + current,
      });
    }
  }

  // Convert to array and sort by month
  const result: PortfolioGrowthPoint[] = [];
  const sortedMonths = Array.from(monthlyData.keys()).sort();

  for (const month of sortedMonths) {
    const data = monthlyData.get(month)!;
    result.push({
      month,
      total_invested: data.invested,
      total_current_value: data.current,
      gain_loss: data.current - data.invested,
    });
  }

  return result;
}

/**
 * Pure function to aggregate portfolio from snapshots
 * Used for property testing without database dependency
 * 
 * Requirements: 4.2, 4.4
 */
export function aggregatePortfolio(
  snapshots: Array<{
    type: InvestmentType;
    invested_amount: number;
    current_value: number;
  }>
): InvestmentComparison {
  const gold: PortfolioSummary = {
    total_invested: 0,
    total_current_value: 0,
    total_gain_loss: 0,
  };

  const mutualFund: PortfolioSummary = {
    total_invested: 0,
    total_current_value: 0,
    total_gain_loss: 0,
  };

  for (const snapshot of snapshots) {
    const target = snapshot.type === 'GOLD' ? gold : mutualFund;
    target.total_invested += snapshot.invested_amount;
    target.total_current_value += snapshot.current_value;
  }

  gold.total_gain_loss = gold.total_current_value - gold.total_invested;
  mutualFund.total_gain_loss = mutualFund.total_current_value - mutualFund.total_invested;

  return {
    gold,
    mutual_fund: mutualFund,
  };
}
