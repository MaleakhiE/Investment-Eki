/**
 * Notification Settings API Route
 * 
 * GET /api/settings/notifications - Get notification settings
 * POST /api/settings/notifications - Update notification settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { safeDatabaseErrorCode } from '@/lib/error-safety';
import { prisma } from '@/lib/prisma';
import { encryptNumber, decryptNumber } from '@/lib/encryption';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';

export interface NotificationSettingsResponse {
  monthly_reminder: boolean;
  monthly_reminder_day: number;
  monthly_summary: boolean;
  low_balance_alert: boolean;
  low_balance_threshold: number;
  custom_alerts: CustomAlert[];
}

export interface CustomAlert {
  id: string;
  name: string;
  type: 'expense_limit' | 'income_target' | 'savings_goal';
  threshold: number;
  enabled: boolean;
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }
    
    let settings = await prisma.notificationSettings.findUnique({
      where: { user_id: userId },
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: {
          user_id: userId,
          monthly_reminder: true,
          monthly_reminder_day: 25,
          monthly_summary: true,
          low_balance_alert: false,
          low_balance_threshold: encryptNumber(0),
          custom_alerts: JSON.stringify([]),
        },
      });
    }

    const response: NotificationSettingsResponse = {
      monthly_reminder: settings.monthly_reminder,
      monthly_reminder_day: settings.monthly_reminder_day,
      monthly_summary: settings.monthly_summary,
      low_balance_alert: settings.low_balance_alert,
      low_balance_threshold: decryptNumber(settings.low_balance_threshold),
      custom_alerts: settings.custom_alerts ? JSON.parse(settings.custom_alerts) : [],
    };

    return NextResponse.json(successResponse(response, 'Notification settings retrieved'));
  } catch (error) {
    console.error('Error getting notification settings:', { code: safeDatabaseErrorCode(error) });
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const body = await request.json();

    const {
      monthly_reminder,
      monthly_reminder_day,
      monthly_summary,
      low_balance_alert,
      low_balance_threshold,
      custom_alerts,
    } = body;

    // Validate monthly_reminder_day
    if (monthly_reminder_day !== undefined && (monthly_reminder_day < 1 || monthly_reminder_day > 28)) {
      return NextResponse.json(errorResponse('Tanggal pengingat harus antara 1-28'), { status: 400 });
    }

    // Validate low_balance_threshold
    if (low_balance_threshold !== undefined && low_balance_threshold < 0) {
      return NextResponse.json(errorResponse('Threshold saldo tidak boleh negatif'), { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    
    if (monthly_reminder !== undefined) updateData.monthly_reminder = monthly_reminder;
    if (monthly_reminder_day !== undefined) updateData.monthly_reminder_day = monthly_reminder_day;
    if (monthly_summary !== undefined) updateData.monthly_summary = monthly_summary;
    if (low_balance_alert !== undefined) updateData.low_balance_alert = low_balance_alert;
    if (low_balance_threshold !== undefined) updateData.low_balance_threshold = encryptNumber(low_balance_threshold);
    if (custom_alerts !== undefined) updateData.custom_alerts = JSON.stringify(custom_alerts);

    const settings = await prisma.notificationSettings.upsert({
      where: { user_id: userId },
      update: updateData,
      create: {
        user_id: userId,
        monthly_reminder: monthly_reminder ?? true,
        monthly_reminder_day: monthly_reminder_day ?? 25,
        monthly_summary: monthly_summary ?? true,
        low_balance_alert: low_balance_alert ?? false,
        low_balance_threshold: encryptNumber(low_balance_threshold ?? 0),
        custom_alerts: JSON.stringify(custom_alerts ?? []),
      },
    });

    const response: NotificationSettingsResponse = {
      monthly_reminder: settings.monthly_reminder,
      monthly_reminder_day: settings.monthly_reminder_day,
      monthly_summary: settings.monthly_summary,
      low_balance_alert: settings.low_balance_alert,
      low_balance_threshold: decryptNumber(settings.low_balance_threshold),
      custom_alerts: settings.custom_alerts ? JSON.parse(settings.custom_alerts) : [],
    };

    return NextResponse.json(successResponse(response, 'Notification settings updated'));
  } catch (error) {
    console.error('Error updating notification settings:', { code: safeDatabaseErrorCode(error) });
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
