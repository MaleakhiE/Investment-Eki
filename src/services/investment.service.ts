/**
 * Investment Service
 * 
 * Provides investment management functionality including:
 * - Gain/loss calculation
 * - Investment snapshot persistence with encryption
 * - Investment history retrieval with decryption
 * - Auto-create expense transaction when adding new investment
 */

import { Prisma } from '@prisma/client';
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

const SNAPSHOT_TRANSACTION_MAX_ATTEMPTS = 3;

function isWriteConflict(error: unknown): error is { code: 'P2034' } {
  return (
    typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === 'P2034'
  );
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

  for (let attempt = 1; attempt <= SNAPSHOT_TRANSACTION_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(async (transactionClient) => {
        // Get or create the investment inside the same serializable transaction
        // that owns the snapshot and generated cashflow write.
        let investment = await transactionClient.investment.findUnique({
          where: {
            user_id_type: {
              user_id: userId,
              type: input.type as InvestmentType,
            },
          },
        });

        if (!investment) {
          investment = await transactionClient.investment.create({
            data: {
              user_id: userId,
              type: input.type as InvestmentType,
            },
          });
        }

        const existingSnapshot = await transactionClient.investmentSnapshot.findUnique({
          where: {
            investment_id_month: {
              investment_id: investment.id,
              month: input.month,
            },
          },
        });
        const isNewSnapshot = !existingSnapshot;
        const previousInvestedAmount = existingSnapshot
          ? decryptNumber(existingSnapshot.invested_amount)
          : 0;

        // Encrypt within each attempt so every retried transaction constructs
        // the complete persisted state independently.
        const encryptedInvestedAmount = encryptNumber(input.invested_amount);
        const encryptedCurrentValue = encryptNumber(input.current_value);
        const record = await transactionClient.investmentSnapshot.upsert({
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

        const investmentDifference = input.invested_amount - previousInvestedAmount;
        const shouldCreateTransaction =
          input.createTransaction !== false && investmentDifference > 0;

        if (shouldCreateTransaction) {
          const [year, monthNum] = input.month.split('-');
          const transactionResult = await createTransaction(userId, {
            date: `${year}-${monthNum}-01`,
            type: 'EXPENSE',
            category: 'Investment',
            description: input.type === 'GOLD'
              ? 'Gold Investment'
              : `${input.platform || 'Mutual Fund'} - ${input.product_name || 'Reksa Dana'}`,
            amount: investmentDifference,
          }, transactionClient);

          if (!transactionResult.success) {
            throw new Error(
              transactionResult.error || 'Generated investment expense could not be saved',
            );
          }
        }

        const snapshotRecord = record as Record<string, unknown>;
        return {
          success: true,
          snapshot: {
            id: record.id,
            investment_id: record.investment_id,
            month: record.month,
            invested_amount: input.invested_amount,
            current_value: input.current_value,
            gain_loss: calculateGainLoss(input.invested_amount, input.current_value),
            platform: (snapshotRecord.platform as string) || undefined,
            product_name: (snapshotRecord.product_name as string) || undefined,
            units: (snapshotRecord.units as string) || undefined,
            nav_per_unit: (snapshotRecord.nav_per_unit as string) || undefined,
            created_at: record.created_at,
          },
          isNewSnapshot,
          transactionCreated: shouldCreateTransaction,
        };
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!isWriteConflict(error) || attempt === SNAPSHOT_TRANSACTION_MAX_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw new Error('Investment snapshot transaction attempts exhausted');
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

export interface DeleteSnapshotResult {
  success: boolean;
  error?: string;
}

/**
 * Delete investment snapshot by ID
 * Verifies ownership before deletion
 * 
 * Requirements: 3.4
 */
export async function deleteSnapshot(
  userId: bigint,
  snapshotId: bigint
): Promise<DeleteSnapshotResult> {
  // Get snapshot with investment to verify ownership
  const snapshot = await prisma.investmentSnapshot.findUnique({
    where: { id: snapshotId },
    include: { investment: true },
  });

  if (!snapshot) {
    return { success: false, error: 'NOT_FOUND' };
  }

  // Verify ownership
  if (snapshot.investment.user_id !== userId) {
    return { success: false, error: 'NOT_FOUND' };
  }

  // Delete snapshot
  await prisma.investmentSnapshot.delete({
    where: { id: snapshotId },
  });

  return { success: true };
}
