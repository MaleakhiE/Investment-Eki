/**
 * Investment Service
 * 
 * Provides investment management functionality including:
 * - Gain/loss calculation
 * - Investment snapshot persistence with encryption
 * - Investment history retrieval with decryption
 * - Auto-create expense transaction when adding new investment
 */

import { prisma } from '@/lib/prisma';
import { encryptNumber, decryptNumber } from '@/lib/encryption';
import { validateSnapshotInput, InvestmentSnapshotInput, InvestmentType } from '@/lib/validation';
import { createTransaction } from './transaction.service';

/**
 * Investment snapshot record with decrypted values
 */
export interface InvestmentSnapshotRecord {
  id: bigint;
  investment_id: bigint;
  month: string;
  invested_amount: number;
  current_value: number;
  gain_loss: number;
  platform?: string;
  product_name?: string;
  units?: string;
  nav_per_unit?: string;
  created_at: Date;
}

/**
 * Calculate gain/loss from invested amount and current value
 * gain_loss = current_value - invested_amount
 * 
 * Requirements: 3.3
 */
export function calculateGainLoss(investedAmount: number, currentValue: number): number {
  return currentValue - investedAmount;
}

export interface SaveSnapshotResult {
  success: boolean;
  snapshot?: InvestmentSnapshotRecord;
  error?: string;
  isNewSnapshot?: boolean;
  transactionCreated?: boolean;
}

/**
 * Save or update investment snapshot for a user, type, and month
 * Uses upsert logic - creates new record or updates existing
 * Auto-creates investment record if not exists
 * Optionally creates expense transaction for new investments
 * All monetary values are encrypted before storing
 * 
 * Requirements: 3.2, 3.5, 10.2
 */
export async function saveSnapshot(
  userId: bigint,
  input: InvestmentSnapshotInput & { 
    platform?: string; 
    product_name?: string; 
    units?: string; 
    nav_per_unit?: string;
    createTransaction?: boolean; // If true, create expense transaction
  }
): Promise<SaveSnapshotResult> {
  // Validate input
  const validation = validateSnapshotInput(input);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(', ') };
  }

  // Get or create investment record
  let investment = await prisma.investment.findUnique({
    where: {
      user_id_type: {
        user_id: userId,
        type: input.type as InvestmentType,
      },
    },
  });

  if (!investment) {
    investment = await prisma.investment.create({
      data: {
        user_id: userId,
        type: input.type as InvestmentType,
      },
    });
  }

  // Check if this is a new snapshot or update
  const existingSnapshot = await prisma.investmentSnapshot.findUnique({
    where: {
      investment_id_month: {
        investment_id: investment.id,
        month: input.month,
      },
    },
  });

  const isNewSnapshot = !existingSnapshot;
  let previousInvestedAmount = 0;
  
  if (existingSnapshot) {
    previousInvestedAmount = decryptNumber(existingSnapshot.invested_amount);
  }

  // Encrypt monetary values
  const encryptedInvestedAmount = encryptNumber(input.invested_amount);
  const encryptedCurrentValue = encryptNumber(input.current_value);

  // Upsert snapshot record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const record = await (prisma.investmentSnapshot as any).upsert({
    where: {
      investment_id_month: {
        investment_id: investment.id,
        month: input.month,
      },
    },
    update: {
      invested_amount: encryptedInvestedAmount,
      current_value: encryptedCurrentValue,
      platform: input.platform || null,
      product_name: input.product_name || null,
      units: input.units || null,
      nav_per_unit: input.nav_per_unit || null,
    },
    create: {
      investment_id: investment.id,
      month: input.month,
      invested_amount: encryptedInvestedAmount,
      current_value: encryptedCurrentValue,
      platform: input.platform || null,
      product_name: input.product_name || null,
      units: input.units || null,
      nav_per_unit: input.nav_per_unit || null,
    },
  });

  // Create expense transaction if requested and there's a difference in invested amount
  if (input.createTransaction !== false) {
    const investmentDifference = input.invested_amount - previousInvestedAmount;
    
    if (investmentDifference > 0) {
      // Create expense transaction for the new investment amount
      const [year, monthNum] = input.month.split('-');
      const transactionDate = `${year}-${monthNum}-01`;
      const category = input.type === 'GOLD' ? 'Investment' : 'Investment';
      const description = input.type === 'GOLD' 
        ? 'Gold Investment' 
        : `${input.platform || 'Mutual Fund'} - ${input.product_name || 'Reksa Dana'}`;

      await createTransaction(userId, {
        date: transactionDate,
        type: 'EXPENSE',
        category,
        description,
        amount: investmentDifference,
      });
    }
  }

  // Calculate gain/loss
  const gainLoss = calculateGainLoss(input.invested_amount, input.current_value);

  // Return decrypted record
  const snapshotRecord = record as Record<string, unknown>;
  return {
    success: true,
    snapshot: {
      id: record.id,
      investment_id: record.investment_id,
      month: record.month,
      invested_amount: input.invested_amount,
      current_value: input.current_value,
      gain_loss: gainLoss,
      platform: (snapshotRecord.platform as string) || undefined,
      product_name: (snapshotRecord.product_name as string) || undefined,
      units: (snapshotRecord.units as string) || undefined,
      nav_per_unit: (snapshotRecord.nav_per_unit as string) || undefined,
      created_at: record.created_at,
    },
    isNewSnapshot,
    transactionCreated: input.createTransaction !== false && (input.invested_amount - previousInvestedAmount) > 0,
  };
}


/**
 * Get investment snapshot by investment ID and month
 * Decrypts monetary values when retrieving
 * 
 * Requirements: 3.4, 10.3
 */
export async function getSnapshotByInvestmentAndMonth(
  investmentId: bigint,
  month: string
): Promise<InvestmentSnapshotRecord | null> {
  const record = await prisma.investmentSnapshot.findUnique({
    where: {
      investment_id_month: {
        investment_id: investmentId,
        month: month,
      },
    },
  });

  if (!record) {
    return null;
  }

  // Decrypt monetary values
  const investedAmount = decryptNumber(record.invested_amount);
  const currentValue = decryptNumber(record.current_value);

  return {
    id: record.id,
    investment_id: record.investment_id,
    month: record.month,
    invested_amount: investedAmount,
    current_value: currentValue,
    gain_loss: calculateGainLoss(investedAmount, currentValue),
    created_at: record.created_at,
  };
}

/**
 * Get investment by user ID and type
 * 
 * Requirements: 3.4
 */
export async function getInvestmentByUserAndType(
  userId: bigint,
  type: InvestmentType
): Promise<{ id: bigint; user_id: bigint; type: InvestmentType; created_at: Date } | null> {
  const investment = await prisma.investment.findUnique({
    where: {
      user_id_type: {
        user_id: userId,
        type: type,
      },
    },
  });

  if (!investment) {
    return null;
  }

  return {
    id: investment.id,
    user_id: investment.user_id,
    type: investment.type as InvestmentType,
    created_at: investment.created_at,
  };
}


/**
 * Get all snapshots for an investment, ordered by month
 * Decrypts monetary values when retrieving
 * 
 * Requirements: 3.4, 10.3, 10.5
 */
export async function getSnapshotsByInvestment(investmentId: bigint): Promise<InvestmentSnapshotRecord[]> {
  const records = await prisma.investmentSnapshot.findMany({
    where: { investment_id: investmentId },
    orderBy: { month: 'desc' },
  });

  // Decrypt monetary values for each record
  return records.map((record) => {
    const investedAmount = decryptNumber(record.invested_amount);
    const currentValue = decryptNumber(record.current_value);
    const rec = record as Record<string, unknown>;
    return {
      id: record.id,
      investment_id: record.investment_id,
      month: record.month,
      invested_amount: investedAmount,
      current_value: currentValue,
      gain_loss: calculateGainLoss(investedAmount, currentValue),
      platform: (rec.platform as string) || undefined,
      product_name: (rec.product_name as string) || undefined,
      units: (rec.units as string) || undefined,
      nav_per_unit: (rec.nav_per_unit as string) || undefined,
      created_at: record.created_at,
    };
  });
}

/**
 * Get all snapshots for a user and investment type, ordered by month
 * Decrypts monetary values when retrieving
 * 
 * Requirements: 3.4, 10.3, 10.5
 */
export async function getSnapshotsByUserAndType(
  userId: bigint,
  type: InvestmentType
): Promise<InvestmentSnapshotRecord[]> {
  // First get the investment
  const investment = await prisma.investment.findUnique({
    where: {
      user_id_type: {
        user_id: userId,
        type: type,
      },
    },
  });

  if (!investment) {
    return [];
  }

  // Get all snapshots for this investment
  return getSnapshotsByInvestment(investment.id);
}
