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
import { sendMonthlyNotifications } from '@/services/notification.service';
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';

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
    // Verify cron secret for security (optional but recommended)
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      const providedSecret = authHeader?.replace('Bearer ', '');
      
      if (providedSecret !== cronSecret) {
        return NextResponse.json(
          unauthorizedResponse('Invalid cron secret'),
          { status: 401 }
        );
      }
    }

    // Send monthly notifications to all users
    const result = await sendMonthlyNotifications();

    return NextResponse.json(
      successResponse(
        {
          sent: result.sent,
          failed: result.failed,
          total: result.sent + result.failed,
          details: result.results.map((r) => ({
            userId: r.userId.toString(),
            type: r.type,
            success: r.success,
          })),
        },
        `Monthly notifications processed: ${result.sent} sent, ${result.failed} failed`
      )
    );
  } catch (error) {
    console.error('Error sending monthly notifications:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
