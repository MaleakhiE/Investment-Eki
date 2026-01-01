/**
 * Investment Service
 * 
 * Provides investment management functionality including:
 * - Gain/loss calculation
 * - Investment snapshot persistence with encryption
 * - Investment history retrieval with decryption
 */

import { prisma } from '@/lib/prisma';
import { encryptNumber, decryptNumber } from '@/lib/encryption';
import { validateSnapshotInput, InvestmentSnapshotInput, InvestmentType } from '@/lib/validation';

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
}

/**
 * Save or update investment snapshot for a user, type, and month
 * Uses upsert logic - creates new record or updates existing
 * Auto-creates investment record if not exists
 * All monetary values are encrypted before storing
 * 
 * Requirements: 3.2, 3.5, 10.2
 */
export async function saveSnapshot(
  userId: bigint,
  input: InvestmentSnapshotInput
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

  // Encrypt monetary values
  const encryptedInvestedAmount = encryptNumber(input.invested_amount);
  const encryptedCurrentValue = encryptNumber(input.current_value);

  // Upsert snapshot record
  const record = await prisma.investmentSnapshot.upsert({
    where: {
      investment_id_month: {
        investment_id: investment.id,
        month: input.month,
      },
    },
    update: {
      invested_amount: encryptedInvestedAmount,
      current_value: encryptedCurrentValue,
    },
    create: {
      investment_id: investment.id,
      month: input.month,
      invested_amount: encryptedInvestedAmount,
      current_value: encryptedCurrentValue,
    },
  });

  // Calculate gain/loss
  const gainLoss = calculateGainLoss(input.invested_amount, input.current_value);

  // Return decrypted record
  return {
    success: true,
    snapshot: {
      id: record.id,
      investment_id: record.investment_id,
      month: record.month,
      invested_amount: input.invested_amount,
      current_value: input.current_value,
      gain_loss: gainLoss,
      created_at: record.created_at,
    },
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
    return {
      id: record.id,
      investment_id: record.investment_id,
      month: record.month,
      invested_amount: investedAmount,
      current_value: currentValue,
      gain_loss: calculateGainLoss(investedAmount, currentValue),
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
