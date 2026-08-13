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
  unauthorizedResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-response';
import { isFiniteNonNegativeAmount } from '@/lib/financial-input';

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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(validationErrorResponse(['Invalid JSON body']), { status: 400 });
    }

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json(validationErrorResponse(['Invalid JSON body']), { status: 400 });
    }

    const {
      monthly_reminder,
      monthly_reminder_day,
      monthly_summary,
      low_balance_alert,
      low_balance_threshold,
      custom_alerts,
    } = body as {
      monthly_reminder?: unknown;
      monthly_reminder_day?: unknown;
      monthly_summary?: unknown;
      low_balance_alert?: unknown;
      low_balance_threshold?: unknown;
      custom_alerts?: unknown;
    };

    const booleanFields = [
      ['monthly_reminder', monthly_reminder],
      ['monthly_summary', monthly_summary],
      ['low_balance_alert', low_balance_alert],
    ] as const;
    const invalidBoolean = booleanFields.find(([, value]) => value !== undefined && typeof value !== 'boolean');
    if (invalidBoolean) {
      return NextResponse.json(validationErrorResponse([`${invalidBoolean[0]} must be a boolean`]), { status: 400 });
    }

    if (
      monthly_reminder_day !== undefined
      && (typeof monthly_reminder_day !== 'number'
        || !Number.isInteger(monthly_reminder_day)
        || monthly_reminder_day < 1
        || monthly_reminder_day > 28)
    ) {
      return NextResponse.json(validationErrorResponse(['monthly_reminder_day must be an integer between 1 and 28']), { status: 400 });
    }

    if (low_balance_threshold !== undefined && !isFiniteNonNegativeAmount(low_balance_threshold)) {
      return NextResponse.json(validationErrorResponse(['low_balance_threshold must be a finite non-negative amount']), { status: 400 });
    }

    if (custom_alerts !== undefined) {
      const validTypes = new Set<CustomAlert['type']>(['expense_limit', 'income_target', 'savings_goal']);
      const valid = Array.isArray(custom_alerts) && custom_alerts.every((alert) => {
        if (typeof alert !== 'object' || alert === null || Array.isArray(alert)) return false;
        const candidate = alert as Record<string, unknown>;
        return (
          typeof candidate.id === 'string'
          && typeof candidate.name === 'string'
          && validTypes.has(candidate.type as CustomAlert['type'])
          && isFiniteNonNegativeAmount(candidate.threshold)
          && typeof candidate.enabled === 'boolean'
        );
      });
      if (!valid) {
        return NextResponse.json(validationErrorResponse(['custom_alerts must contain valid alert objects']), { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {};
    
    if (monthly_reminder !== undefined) updateData.monthly_reminder = monthly_reminder;
    if (monthly_reminder_day !== undefined) updateData.monthly_reminder_day = monthly_reminder_day;
    if (monthly_summary !== undefined) updateData.monthly_summary = monthly_summary;
    if (low_balance_alert !== undefined) updateData.low_balance_alert = low_balance_alert;
    if (low_balance_threshold !== undefined) updateData.low_balance_threshold = encryptNumber(low_balance_threshold as number);
    if (custom_alerts !== undefined) updateData.custom_alerts = JSON.stringify(custom_alerts);

    const settings = await prisma.notificationSettings.upsert({
      where: { user_id: userId },
      update: updateData,
      create: {
        user_id: userId,
        monthly_reminder: (monthly_reminder as boolean | undefined) ?? true,
        monthly_reminder_day: (monthly_reminder_day as number | undefined) ?? 25,
        monthly_summary: (monthly_summary as boolean | undefined) ?? true,
        low_balance_alert: (low_balance_alert as boolean | undefined) ?? false,
        low_balance_threshold: encryptNumber((low_balance_threshold as number | undefined) ?? 0),
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
