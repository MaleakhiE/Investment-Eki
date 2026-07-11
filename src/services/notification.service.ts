/**
 * Notification Service
 * 
 * Provides notification functionality including:
 * - Email content builders for reminder and summary emails
 * - Notification type selection logic
 * - Email sending via Nodemailer
 * - Notification logging
 * - Monthly notification scheduler
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { prisma } from '@/lib/prisma';
import { decrypt, decryptNumber } from '@/lib/encryption';
import { sendSmtpMail } from './smtp.service';
import { CashflowRecord } from './cashflow.service';
import { PortfolioSummary } from './analytics.service';

/**
 * Notification type enum matching Prisma schema
 */
export type NotificationType = 'REMINDER' | 'SUMMARY';

/**
 * Email content structure
 */
export interface EmailContent {
  to: string;
  subject: string;
  html: string;
}

/**
 * Notification log record
 */
export interface NotificationLogRecord {
  id: bigint;
  user_id: bigint;
  month: string;
  type: NotificationType;
  sent_at: Date;
}

/**
 * Investment summary for email content
 */
export interface InvestmentSummary {
  type: 'GOLD' | 'MUTUAL_FUND';
  invested_amount: number;
  current_value: number;
  gain_loss: number;
}

/**
 * Summary email data structure
 */
export interface SummaryEmailData {
  month: string;
  income: number;
  total_expense: number;
  net_cashflow: number;
  gold_summary: PortfolioSummary;
  mutual_fund_summary: PortfolioSummary;
}


/**
 * Format currency value for display in emails
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format month string (YYYY-MM) to readable format
 */
function formatMonth(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

/**
 * Build reminder email content for users who haven't entered data for the current month
 * 
 * Requirements: 6.1
 */
export function buildReminderEmailContent(
  userEmail: string,
  month: string
): EmailContent {
  const formattedMonth = formatMonth(month);
  
  return {
    to: userEmail,
    subject: `Pengingat: Masukkan Data Keuangan ${formattedMonth}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Pengingat Data Keuangan Bulanan</h2>
        <p>Halo,</p>
        <p>Kami ingin mengingatkan bahwa Anda belum memasukkan data keuangan untuk bulan <strong>${formattedMonth}</strong>.</p>
        <p>Silakan login ke aplikasi Personal Finance Tracker untuk mencatat:</p>
        <ul>
          <li>Pendapatan bulanan</li>
          <li>Pengeluaran (sewa, biaya hidup, lainnya)</li>
          <li>Snapshot investasi (Emas dan Reksa Dana)</li>
        </ul>
        <p>Mencatat data keuangan secara rutin akan membantu Anda memantau kesehatan finansial dengan lebih baik.</p>
        <p>Salam,<br/>Personal Finance Tracker</p>
      </div>
    `,
  };
}


/**
 * Build summary email content with all required financial data
 * 
 * Requirements: 6.3
 * - Must include: month, total income, total expense, net cashflow,
 *   Gold investment summary, and Mutual Fund investment summary
 */
export function buildSummaryEmailContent(
  userEmail: string,
  data: SummaryEmailData
): EmailContent {
  const formattedMonth = formatMonth(data.month);
  
  const gainLossColor = (value: number) => value >= 0 ? '#28a745' : '#dc3545';
  const gainLossSign = (value: number) => value >= 0 ? '+' : '';
  
  return {
    to: userEmail,
    subject: `Ringkasan Keuangan ${formattedMonth}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Ringkasan Keuangan Bulanan</h2>
        <p>Berikut adalah ringkasan keuangan Anda untuk bulan <strong>${formattedMonth}</strong>:</p>
        
        <h3 style="color: #555; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Arus Kas</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0;">Total Pendapatan</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatCurrency(data.income)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">Total Pengeluaran</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #dc3545;">${formatCurrency(data.total_expense)}</td>
          </tr>
          <tr style="border-top: 2px solid #333;">
            <td style="padding: 8px 0; font-weight: bold;">Arus Kas Bersih</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${gainLossColor(data.net_cashflow)};">
              ${gainLossSign(data.net_cashflow)}${formatCurrency(data.net_cashflow)}
            </td>
          </tr>
        </table>
        
        <h3 style="color: #555; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Investasi Emas</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0;">Total Investasi</td>
            <td style="padding: 8px 0; text-align: right;">${formatCurrency(data.gold_summary.total_invested)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">Nilai Saat Ini</td>
            <td style="padding: 8px 0; text-align: right;">${formatCurrency(data.gold_summary.total_current_value)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">Keuntungan/Kerugian</td>
            <td style="padding: 8px 0; text-align: right; color: ${gainLossColor(data.gold_summary.total_gain_loss)};">
              ${gainLossSign(data.gold_summary.total_gain_loss)}${formatCurrency(data.gold_summary.total_gain_loss)}
            </td>
          </tr>
        </table>
        
        <h3 style="color: #555; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Investasi Reksa Dana</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0;">Total Investasi</td>
            <td style="padding: 8px 0; text-align: right;">${formatCurrency(data.mutual_fund_summary.total_invested)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">Nilai Saat Ini</td>
            <td style="padding: 8px 0; text-align: right;">${formatCurrency(data.mutual_fund_summary.total_current_value)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">Keuntungan/Kerugian</td>
            <td style="padding: 8px 0; text-align: right; color: ${gainLossColor(data.mutual_fund_summary.total_gain_loss)};">
              ${gainLossSign(data.mutual_fund_summary.total_gain_loss)}${formatCurrency(data.mutual_fund_summary.total_gain_loss)}
            </td>
          </tr>
        </table>
        
        <p style="color: #666; font-size: 14px;">
          Terima kasih telah menggunakan Personal Finance Tracker untuk mengelola keuangan Anda.
        </p>
        <p>Salam,<br/>Personal Finance Tracker</p>
      </div>
    `,
  };
}


/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Determine notification type based on whether cashflow data exists for the month
 * 
 * Requirements: 6.1, 6.2
 * - If cashflow exists for current month: SUMMARY
 * - If cashflow does not exist: REMINDER
 */
export function determineNotificationType(
  cashflowExists: boolean
): NotificationType {
  return cashflowExists ? 'SUMMARY' : 'REMINDER';
}

/**
 * Check if cashflow exists for a user and month
 */
export async function checkCashflowExists(
  userId: bigint,
  month: string
): Promise<boolean> {
  const cashflow = await prisma.monthlyCashflow.findUnique({
    where: {
      user_id_month: {
        user_id: userId,
        month: month,
      },
    },
  });
  return cashflow !== null;
}

/**
 * Send email using Nodemailer
 * 
 * Requirements: 6.5
 */
export async function sendEmail(content: EmailContent): Promise<boolean> {
  try {
    await sendSmtpMail(content);
    
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Log notification to database
 * 
 * Requirements: 6.4
 */
export async function logNotification(
  userId: bigint,
  month: string,
  type: NotificationType
): Promise<NotificationLogRecord> {
  const log = await prisma.notificationLog.create({
    data: {
      user_id: userId,
      month: month,
      type: type,
    },
  });
  
  return {
    id: log.id,
    user_id: log.user_id,
    month: log.month,
    type: log.type as NotificationType,
    sent_at: log.sent_at,
  };
}


/**
 * Get notification log by user, month, and type
 */
export async function getNotificationLog(
  userId: bigint,
  month: string,
  type: NotificationType
): Promise<NotificationLogRecord | null> {
  const log = await prisma.notificationLog.findFirst({
    where: {
      user_id: userId,
      month: month,
      type: type,
    },
  });
  
  if (!log) {
    return null;
  }
  
  return {
    id: log.id,
    user_id: log.user_id,
    month: log.month,
    type: log.type as NotificationType,
    sent_at: log.sent_at,
  };
}

/**
 * Send monthly notifications to all users
 * Determines notification type based on cashflow data existence
 * 
 * Requirements: 6.1, 6.2
 */
export async function sendMonthlyNotifications(): Promise<{
  sent: number;
  failed: number;
  results: Array<{ userId: bigint; type: NotificationType; success: boolean }>;
}> {
  const currentMonth = getCurrentMonth();
  
  // Get all users
  const users = await prisma.user.findMany();
  
  const results: Array<{ userId: bigint; type: NotificationType; success: boolean }> = [];
  let sent = 0;
  let failed = 0;
  
  for (const user of users) {
    try {
      // Check if cashflow exists for current month
      const cashflowExists = await checkCashflowExists(user.id, currentMonth);
      const notificationType = determineNotificationType(cashflowExists);
      
      // Decrypt user email
      const userEmail = decrypt(user.email);
      
      let emailContent: EmailContent;
      
      if (notificationType === 'REMINDER') {
        emailContent = buildReminderEmailContent(userEmail, currentMonth);
      } else {
        // Get cashflow and investment data for summary
        const summaryData = await getSummaryEmailData(user.id, currentMonth);
        emailContent = buildSummaryEmailContent(userEmail, summaryData);
      }
      
      // Send email
      const emailSent = await sendEmail(emailContent);
      
      if (emailSent) {
        // Log notification
        await logNotification(user.id, currentMonth, notificationType);
        sent++;
        results.push({ userId: user.id, type: notificationType, success: true });
      } else {
        failed++;
        results.push({ userId: user.id, type: notificationType, success: false });
      }
    } catch (error) {
      console.error(`Failed to process notification for user ${user.id}:`, error);
      failed++;
      results.push({ userId: user.id, type: 'REMINDER', success: false });
    }
  }
  
  return { sent, failed, results };
}

/**
 * Get summary email data for a user and month
 */
async function getSummaryEmailData(
  userId: bigint,
  month: string
): Promise<SummaryEmailData> {
  // Get cashflow data
  const cashflow = await prisma.monthlyCashflow.findUnique({
    where: {
      user_id_month: {
        user_id: userId,
        month: month,
      },
    },
  });
  
  // Get investment summaries
  const goldSummary = await getInvestmentSummary(userId, 'GOLD');
  const mutualFundSummary = await getInvestmentSummary(userId, 'MUTUAL_FUND');
  
  return {
    month: month,
    income: cashflow ? decryptNumber(cashflow.income) : 0,
    total_expense: cashflow ? decryptNumber(cashflow.total_expense) : 0,
    net_cashflow: cashflow ? decryptNumber(cashflow.net_cashflow) : 0,
    gold_summary: goldSummary,
    mutual_fund_summary: mutualFundSummary,
  };
}

/**
 * Get investment summary for a specific type
 */
async function getInvestmentSummary(
  userId: bigint,
  type: 'GOLD' | 'MUTUAL_FUND'
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
        take: 1,
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
