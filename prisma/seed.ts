import { PrismaClient, InvestmentType } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Encryption functions (duplicated here to avoid import issues during seeding)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  if (key.length === 32) {
    return Buffer.from(key, 'utf-8');
  }
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, 'hex');
  }
  return crypto.createHash('sha256').update(key).digest();
}

function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

function encryptNumber(value: number): string {
  return encrypt(value.toString());
}

async function main() {
  console.log('Starting database seed...');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const encryptedEmail = encrypt('admin@example.com');

  const adminUser = await prisma.user.upsert({
    where: { email: encryptedEmail },
    update: {},
    create: {
      email: encryptedEmail,
      password_hash: hashedPassword,
      ai_recommendation_enabled: true,
    },
  });

  console.log(`Created admin user with ID: ${adminUser.id}`);

  // Create sample cashflow data (last 6 months)
  const currentDate = new Date();
  const cashflowData = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() - i);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const income = 10000000 + Math.random() * 5000000;
    const expenseRent = 2000000;
    const expenseLiving = 3000000 + Math.random() * 1000000;
    const expenseOther = 500000 + Math.random() * 500000;
    const totalExpense = expenseRent + expenseLiving + expenseOther;
    const netCashflow = income - totalExpense;

    cashflowData.push({
      user_id: adminUser.id,
      month,
      income: encryptNumber(Math.round(income * 100) / 100),
      expense_rent: encryptNumber(Math.round(expenseRent * 100) / 100),
      expense_living: encryptNumber(Math.round(expenseLiving * 100) / 100),
      expense_other: encryptNumber(Math.round(expenseOther * 100) / 100),
      total_expense: encryptNumber(Math.round(totalExpense * 100) / 100),
      net_cashflow: encryptNumber(Math.round(netCashflow * 100) / 100),
    });
  }

  for (const data of cashflowData) {
    await prisma.monthlyCashflow.upsert({
      where: {
        user_id_month: {
          user_id: data.user_id,
          month: data.month,
        },
      },
      update: data,
      create: data,
    });
  }

  console.log(`Created ${cashflowData.length} cashflow records`);

  // Create investments
  const goldInvestment = await prisma.investment.upsert({
    where: {
      user_id_type: {
        user_id: adminUser.id,
        type: InvestmentType.GOLD,
      },
    },
    update: {},
    create: {
      user_id: adminUser.id,
      type: InvestmentType.GOLD,
    },
  });

  const mutualFundInvestment = await prisma.investment.upsert({
    where: {
      user_id_type: {
        user_id: adminUser.id,
        type: InvestmentType.MUTUAL_FUND,
      },
    },
    update: {},
    create: {
      user_id: adminUser.id,
      type: InvestmentType.MUTUAL_FUND,
    },
  });

  console.log('Created investment records');

  // Create investment snapshots
  let goldInvested = 5000000;
  let mutualFundInvested = 8000000;

  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() - i);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // Gold snapshot (stable growth ~0.5-1% per month)
    const goldGrowth = 1 + (Math.random() * 0.01 + 0.005);
    const goldCurrentValue = goldInvested * goldGrowth;

    await prisma.investmentSnapshot.upsert({
      where: {
        investment_id_month: {
          investment_id: goldInvestment.id,
          month,
        },
      },
      update: {
        invested_amount: encryptNumber(Math.round(goldInvested * 100) / 100),
        current_value: encryptNumber(Math.round(goldCurrentValue * 100) / 100),
      },
      create: {
        investment_id: goldInvestment.id,
        month,
        invested_amount: encryptNumber(Math.round(goldInvested * 100) / 100),
        current_value: encryptNumber(Math.round(goldCurrentValue * 100) / 100),
      },
    });

    // Mutual fund snapshot (more volatile ~-2% to +3% per month)
    const mfGrowth = 1 + (Math.random() * 0.05 - 0.02);
    const mfCurrentValue = mutualFundInvested * mfGrowth;

    await prisma.investmentSnapshot.upsert({
      where: {
        investment_id_month: {
          investment_id: mutualFundInvestment.id,
          month,
        },
      },
      update: {
        invested_amount: encryptNumber(Math.round(mutualFundInvested * 100) / 100),
        current_value: encryptNumber(Math.round(mfCurrentValue * 100) / 100),
      },
      create: {
        investment_id: mutualFundInvestment.id,
        month,
        invested_amount: encryptNumber(Math.round(mutualFundInvested * 100) / 100),
        current_value: encryptNumber(Math.round(mfCurrentValue * 100) / 100),
      },
    });

    // Add to invested amount for next month
    goldInvested += 500000;
    mutualFundInvested += 1000000;
  }

  console.log('Created investment snapshots');
  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
