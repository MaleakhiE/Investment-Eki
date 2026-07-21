/**
 * AI Investment Recommendation Service
 * 
 * Provides AI-powered investment allocation recommendations including:
 * - Financial health analysis (cashflow stability, volatility)
 * - Portfolio balance analysis (Gold vs Mutual Fund split)
 * - Allocation calculation with diversification principles
 * - Reasoning text generation in Bahasa Indonesia
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
 */

import { CashflowRecord, getCashflowHistory } from './cashflow.service';
import { InvestmentSnapshotRecord, getSnapshotsByUserAndType } from './investment.service';
import { InvestmentType } from '@/lib/validation';

/**
 * Financial health analysis result
 */
export interface FinancialHealth {
  average_net_cashflow: number;
  cashflow_volatility: number;  // Standard deviation of net_cashflow
  months_of_data: number;
  has_emergency_fund: boolean;  // Estimated based on positive cashflow history
}

/**
 * Portfolio balance analysis result
 */
export interface PortfolioBalance {
  gold_current_percentage: number;
  mutual_fund_current_percentage: number;
  total_portfolio_value: number;
  gold_performance: number;       // Gain/loss percentage
  mutual_fund_performance: number;
}

/**
 * Risk profile type
 */
export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

/**
 * Complete allocation recommendation
 */
export interface AllocationRecommendation {
  gold_percentage: number;        // 0-100
  mutual_fund_percentage: number; // 0-100
  investable_amount: number;      // Suggested amount to invest this month
  reasoning: string;              // Explanation in Bahasa Indonesia
  risk_profile: RiskProfile;
  should_invest: boolean;         // false if should focus on emergency fund
  warnings: string[];             // Any warnings or caveats
}

/**
 * Analyze financial health from cashflow history
 * Calculates average net cashflow, volatility (standard deviation), and months of data
 * 
 * Requirements: 11.1
 */
export function analyzeFinancialHealth(cashflows: CashflowRecord[]): FinancialHealth {
  if (cashflows.length === 0) {
    return {
      average_net_cashflow: 0,
      cashflow_volatility: 0,
      months_of_data: 0,
      has_emergency_fund: false,
    };
  }

  // Calculate average net cashflow
  const netCashflows = cashflows.map(c => c.net_cashflow);
  const sum = netCashflows.reduce((acc, val) => acc + val, 0);
  const average = sum / netCashflows.length;

  // Calculate standard deviation (volatility)
  const squaredDiffs = netCashflows.map(val => Math.pow(val - average, 2));
  const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / netCashflows.length;
  const volatility = Math.sqrt(avgSquaredDiff);

  // Estimate if user has emergency fund based on consistent positive cashflow
  // Consider having emergency fund if average is positive and at least 3 months of data
  const positiveMonths = netCashflows.filter(cf => cf > 0).length;
  const hasEmergencyFund = average > 0 && cashflows.length >= 3 && positiveMonths >= cashflows.length * 0.6;

  return {
    average_net_cashflow: average,
    cashflow_volatility: volatility,
    months_of_data: cashflows.length,
    has_emergency_fund: hasEmergencyFund,
  };
}


/**
 * Snapshot with type information for portfolio analysis
 */
export interface SnapshotWithType extends InvestmentSnapshotRecord {
  type: InvestmentType;
}

/**
 * Analyze portfolio balance from investment snapshots
 * Calculates current percentage split and performance for each investment type
 * 
 * Requirements: 11.3
 */
export function analyzePortfolioBalance(snapshots: SnapshotWithType[]): PortfolioBalance {
  if (snapshots.length === 0) {
    return {
      gold_current_percentage: 0,
      mutual_fund_current_percentage: 0,
      total_portfolio_value: 0,
      gold_performance: 0,
      mutual_fund_performance: 0,
    };
  }

  // Group snapshots by type and get the latest for each
  const goldSnapshots = snapshots.filter(s => s.type === 'GOLD');
  const mutualFundSnapshots = snapshots.filter(s => s.type === 'MUTUAL_FUND');

  // Get latest snapshot for each type (assuming snapshots are sorted by month desc)
  const latestGold = goldSnapshots.length > 0 ? goldSnapshots[0] : null;
  const latestMutualFund = mutualFundSnapshots.length > 0 ? mutualFundSnapshots[0] : null;

  // Calculate current values
  const goldCurrentValue = latestGold?.current_value ?? 0;
  const mutualFundCurrentValue = latestMutualFund?.current_value ?? 0;
  const totalValue = goldCurrentValue + mutualFundCurrentValue;

  // Calculate percentages
  const goldPercentage = totalValue > 0 ? (goldCurrentValue / totalValue) * 100 : 0;
  const mutualFundPercentage = totalValue > 0 ? (mutualFundCurrentValue / totalValue) * 100 : 0;

  // Calculate performance (gain/loss percentage)
  const goldInvested = latestGold?.invested_amount ?? 0;
  const mutualFundInvested = latestMutualFund?.invested_amount ?? 0;

  const goldPerformance = goldInvested > 0 
    ? ((goldCurrentValue - goldInvested) / goldInvested) * 100 
    : 0;
  const mutualFundPerformance = mutualFundInvested > 0 
    ? ((mutualFundCurrentValue - mutualFundInvested) / mutualFundInvested) * 100 
    : 0;

  return {
    gold_current_percentage: goldPercentage,
    mutual_fund_current_percentage: mutualFundPercentage,
    total_portfolio_value: totalValue,
    gold_performance: goldPerformance,
    mutual_fund_performance: mutualFundPerformance,
  };
}


/**
 * Determine risk profile based on financial health
 */
function determineRiskProfile(health: FinancialHealth): RiskProfile {
  // Conservative if high volatility or few months of data
  if (health.cashflow_volatility > health.average_net_cashflow * 0.5 || health.months_of_data < 3) {
    return 'conservative';
  }
  
  // Aggressive if very stable cashflow and good history
  if (health.cashflow_volatility < health.average_net_cashflow * 0.2 && health.months_of_data >= 6) {
    return 'aggressive';
  }
  
  return 'moderate';
}

/**
 * Calculate recommended allocation based on financial health and portfolio balance
 * 
 * Base allocation: 40% Gold, 60% Mutual Fund
 * Adjustments:
 * - Higher volatility = more gold (stable asset)
 * - Portfolio imbalance = rebalancing toward target
 * - Performance trends = slight shift toward better performer
 * - Diversification: never 0% or 100% in single asset (10-90% range)
 * 
 * Requirements: 11.2, 11.6
 */
export function calculateRecommendedAllocation(
  health: FinancialHealth,
  balance: PortfolioBalance
): { gold_percentage: number; mutual_fund_percentage: number; risk_profile: RiskProfile } {
  // Base allocation: 40% Gold (stable), 60% Mutual Fund (growth)
  let goldAllocation = 40;
  let mutualFundAllocation = 60;

  const riskProfile = determineRiskProfile(health);

  // Adjust for risk profile
  if (riskProfile === 'conservative') {
    // More gold for stability
    goldAllocation += 15;
    mutualFundAllocation -= 15;
  } else if (riskProfile === 'aggressive') {
    // More mutual fund for growth
    goldAllocation -= 10;
    mutualFundAllocation += 10;
  }

  // Adjust for cashflow volatility (higher volatility = more gold)
  if (health.average_net_cashflow > 0 && health.cashflow_volatility > 0) {
    const volatilityRatio = health.cashflow_volatility / health.average_net_cashflow;
    if (volatilityRatio > 0.3) {
      // High volatility - shift toward gold
      const adjustment = Math.min(10, volatilityRatio * 10);
      goldAllocation += adjustment;
      mutualFundAllocation -= adjustment;
    }
  }

  // Adjust for portfolio imbalance (rebalancing)
  if (balance.total_portfolio_value > 0) {
    const goldDiff = balance.gold_current_percentage - goldAllocation;
    const rebalanceAdjustment = goldDiff * 0.2; // Gradual rebalancing
    goldAllocation -= rebalanceAdjustment;
    mutualFundAllocation += rebalanceAdjustment;
  }

  // Adjust for performance trends (slight shift toward better performer)
  const performanceDiff = balance.mutual_fund_performance - balance.gold_performance;
  if (Math.abs(performanceDiff) > 5) {
    const performanceAdjustment = Math.min(5, Math.abs(performanceDiff) * 0.1);
    if (performanceDiff > 0) {
      // Mutual fund performing better
      mutualFundAllocation += performanceAdjustment;
      goldAllocation -= performanceAdjustment;
    } else {
      // Gold performing better
      goldAllocation += performanceAdjustment;
      mutualFundAllocation -= performanceAdjustment;
    }
  }

  // Enforce diversification constraint: 10-90% range
  goldAllocation = Math.max(10, Math.min(90, goldAllocation));
  mutualFundAllocation = 100 - goldAllocation;

  // Round to whole numbers
  goldAllocation = Math.round(goldAllocation);
  mutualFundAllocation = 100 - goldAllocation;

  return {
    gold_percentage: goldAllocation,
    mutual_fund_percentage: mutualFundAllocation,
    risk_profile: riskProfile,
  };
}


/**
 * Check if user should focus on emergency fund instead of investing
 * Returns true if average net cashflow is negative
 * 
 * Requirements: 11.5
 */
export function shouldBuildEmergencyFund(health: FinancialHealth): boolean {
  return health.average_net_cashflow < 0;
}

/**
 * Generate warnings based on financial health
 * 
 * Requirements: 11.5
 */
export function generateWarnings(health: FinancialHealth): string[] {
  const warnings: string[] = [];

  if (health.average_net_cashflow < 0) {
    warnings.push('Rata-rata arus kas Anda negatif. Sebaiknya fokus membangun dana darurat terlebih dahulu sebelum berinvestasi.');
  }

  if (health.months_of_data < 3) {
    warnings.push('Data keuangan Anda masih terbatas. Rekomendasi akan lebih akurat setelah minimal 3 bulan data.');
  }

  if (health.cashflow_volatility > 0 && health.average_net_cashflow > 0) {
    const volatilityRatio = health.cashflow_volatility / health.average_net_cashflow;
    if (volatilityRatio > 0.5) {
      warnings.push('Arus kas Anda cukup fluktuatif. Pertimbangkan untuk menyisihkan dana darurat lebih besar.');
    }
  }

  if (!health.has_emergency_fund && health.average_net_cashflow > 0) {
    warnings.push('Pastikan Anda sudah memiliki dana darurat 3-6 bulan pengeluaran sebelum berinvestasi.');
  }

  return warnings;
}

/**
 * Calculate investable amount based on financial health
 * Suggests investing a portion of average positive cashflow
 * 
 * Requirements: 11.1
 */
export function calculateInvestableAmount(health: FinancialHealth): number {
  if (health.average_net_cashflow <= 0) {
    return 0;
  }

  // Suggest investing 30-50% of average net cashflow based on stability
  let investmentRatio = 0.4; // Default 40%

  if (health.has_emergency_fund) {
    investmentRatio = 0.5; // Can invest more if has emergency fund
  }

  if (health.cashflow_volatility > 0 && health.average_net_cashflow > 0) {
    const volatilityRatio = health.cashflow_volatility / health.average_net_cashflow;
    if (volatilityRatio > 0.3) {
      investmentRatio = 0.3; // More conservative if volatile
    }
  }

  return Math.round(health.average_net_cashflow * investmentRatio * 100) / 100;
}


/**
 * Generate reasoning text in Bahasa Indonesia explaining the allocation recommendation
 * 
 * Requirements: 11.4
 */
export function generateReasoningText(
  health: FinancialHealth,
  balance: PortfolioBalance,
  allocation: { gold_percentage: number; mutual_fund_percentage: number },
  riskProfile: RiskProfile
): string {
  const parts: string[] = [];

  // Introduction based on risk profile
  if (riskProfile === 'conservative') {
    parts.push('Berdasarkan analisis keuangan Anda, kami merekomendasikan strategi investasi konservatif.');
  } else if (riskProfile === 'aggressive') {
    parts.push('Berdasarkan analisis keuangan Anda, kami merekomendasikan strategi investasi agresif untuk pertumbuhan optimal.');
  } else {
    parts.push('Berdasarkan analisis keuangan Anda, kami merekomendasikan strategi investasi moderat yang seimbang.');
  }

  // Explain allocation
  parts.push(`Alokasi yang disarankan adalah ${allocation.gold_percentage}% untuk Emas dan ${allocation.mutual_fund_percentage}% untuk Reksa Dana.`);

  // Explain factors considered
  const factors: string[] = [];

  // Cashflow stability factor
  if (health.average_net_cashflow > 0) {
    if (health.cashflow_volatility > 0) {
      const volatilityRatio = health.cashflow_volatility / health.average_net_cashflow;
      if (volatilityRatio > 0.3) {
        factors.push('arus kas yang cukup fluktuatif (lebih banyak emas untuk stabilitas)');
      } else if (volatilityRatio < 0.2) {
        factors.push('arus kas yang stabil (memungkinkan alokasi lebih besar ke reksa dana)');
      }
    }
  }

  // Data history factor
  if (health.months_of_data < 3) {
    factors.push('data keuangan yang masih terbatas (rekomendasi lebih konservatif)');
  } else if (health.months_of_data >= 6) {
    factors.push('riwayat keuangan yang cukup panjang');
  }

  // Portfolio balance factor
  if (balance.total_portfolio_value > 0) {
    const goldDiff = Math.abs(balance.gold_current_percentage - allocation.gold_percentage);
    if (goldDiff > 10) {
      factors.push('kebutuhan rebalancing portofolio');
    }
  }

  // Performance factor
  if (balance.total_portfolio_value > 0) {
    const performanceDiff = balance.mutual_fund_performance - balance.gold_performance;
    if (Math.abs(performanceDiff) > 5) {
      if (performanceDiff > 0) {
        factors.push('performa reksa dana yang lebih baik');
      } else {
        factors.push('performa emas yang lebih baik');
      }
    }
  }

  if (factors.length > 0) {
    parts.push(`Faktor yang dipertimbangkan: ${factors.join(', ')}.`);
  }

  // Diversification note
  parts.push('Alokasi ini mengikuti prinsip diversifikasi untuk meminimalkan risiko.');

  // Emergency fund note if applicable
  if (!health.has_emergency_fund && health.average_net_cashflow > 0) {
    parts.push('Pastikan Anda sudah memiliki dana darurat sebelum berinvestasi.');
  }

  return parts.join(' ');
}

/**
 * Get complete investment recommendation for a user
 * Orchestrates all analysis and calculation functions
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.7
 */
export async function getInvestmentRecommendation(userId: bigint): Promise<AllocationRecommendation> {
  // Get cashflow history
  const cashflows = await getCashflowHistory(userId);
  
  // Analyze financial health
  const health = analyzeFinancialHealth(cashflows);
  
  // Get investment snapshots for both types
  const goldSnapshots = await getSnapshotsByUserAndType(userId, 'GOLD');
  const mutualFundSnapshots = await getSnapshotsByUserAndType(userId, 'MUTUAL_FUND');
  
  // Combine snapshots with type information
  const allSnapshots: SnapshotWithType[] = [
    ...goldSnapshots.map(s => ({ ...s, type: 'GOLD' as InvestmentType })),
    ...mutualFundSnapshots.map(s => ({ ...s, type: 'MUTUAL_FUND' as InvestmentType })),
  ];
  
  // Analyze portfolio balance
  const balance = analyzePortfolioBalance(allSnapshots);
  
  // Check if should invest or build emergency fund
  const shouldInvest = !shouldBuildEmergencyFund(health);
  
  // Calculate recommended allocation
  const { gold_percentage, mutual_fund_percentage, risk_profile } = calculateRecommendedAllocation(health, balance);
  
  // Calculate investable amount
  const investableAmount = calculateInvestableAmount(health);
  
  // Generate warnings
  const warnings = generateWarnings(health);
  
  // Generate reasoning text
  const reasoning = shouldInvest
    ? generateReasoningText(health, balance, { gold_percentage, mutual_fund_percentage }, risk_profile)
    : 'Arus kas rata-rata Anda negatif. Kami menyarankan untuk fokus membangun dana darurat terlebih dahulu sebelum berinvestasi. Dana darurat idealnya mencakup 3-6 bulan pengeluaran bulanan Anda.';
  
  return {
    gold_percentage,
    mutual_fund_percentage,
    investable_amount: investableAmount,
    reasoning,
    risk_profile,
    should_invest: shouldInvest,
    warnings,
  };
}

/**
 * Pure function version of getInvestmentRecommendation for testing
 * Takes pre-fetched data instead of querying database
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.7
 */
export function calculateInvestmentRecommendation(
  cashflows: CashflowRecord[],
  snapshots: SnapshotWithType[]
): AllocationRecommendation {
  // Analyze financial health
  const health = analyzeFinancialHealth(cashflows);
  
  // Analyze portfolio balance
  const balance = analyzePortfolioBalance(snapshots);
  
  // Check if should invest or build emergency fund
  const shouldInvest = !shouldBuildEmergencyFund(health);
  
  // Calculate recommended allocation
  const { gold_percentage, mutual_fund_percentage, risk_profile } = calculateRecommendedAllocation(health, balance);
  
  // Calculate investable amount
  const investableAmount = calculateInvestableAmount(health);
  
  // Generate warnings
  const warnings = generateWarnings(health);
  
  // Generate reasoning text
  const reasoning = shouldInvest
    ? generateReasoningText(health, balance, { gold_percentage, mutual_fund_percentage }, risk_profile)
    : 'Arus kas rata-rata Anda negatif. Kami menyarankan untuk fokus membangun dana darurat terlebih dahulu sebelum berinvestasi. Dana darurat idealnya mencakup 3-6 bulan pengeluaran bulanan Anda.';
  
  return {
    gold_percentage,
    mutual_fund_percentage,
    investable_amount: investableAmount,
    reasoning,
    risk_profile,
    should_invest: shouldInvest,
    warnings,
  };
}
