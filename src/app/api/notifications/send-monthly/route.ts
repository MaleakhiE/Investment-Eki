/**
 * Monthly Notification Trigger API Route
 * 
 * POST /api/notifications/send-monthly - Trigger monthly notifications for all users
 * 
 * This endpoint is designed to be called by a cron job scheduler.
 * It sends either reminder or summary emails to all users based on their cashflow data.
 * 
 * Requirements: 6.1, 6.2
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getSafeNotificationErrorCode,
  sendMonthlyNotifications,
} from '@/services/notification.service';
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { verifyCronBearer } from '@/lib/cron-auth';

const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
};

/**
 * POST /api/notifications/send-monthly - Trigger monthly notifications
 * 
 * Requirements:
 * - 6.1: Send reminder email if cashflow data does not exist for current month
 * - 6.2: Send summary email if cashflow data exists for current month
 * 
 * Security: This endpoint should be protected by a cron secret in production.
 * The CRON_SECRET environment variable should be set and passed in the Authorization header.
 */
export async function POST(request: NextRequest) {
  try {
    if (!verifyCronBearer(request)) {
      return NextResponse.json(
        unauthorizedResponse('Invalid cron credentials'),
        { status: 401, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    // Send monthly notifications to all users
    const result = await sendMonthlyNotifications();

    return NextResponse.json(
      successResponse(
        {
          sent: result.sent,
          failed: result.failed,
          skipped: result.skipped,
          total: result.sent + result.failed + result.skipped,
        },
        `Monthly notifications processed: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`
      ),
      { headers: PRIVATE_NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error('Monthly notification scheduler failed', {
      code: getSafeNotificationErrorCode(error),
    });
    return NextResponse.json(serverErrorResponse(), {
      status: 500,
      headers: PRIVATE_NO_STORE_HEADERS,
    });
  }
}
