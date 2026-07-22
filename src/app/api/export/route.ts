import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { responseAPI } from '@/lib/api-response';
import { exportToJSON, exportToCSV, getExportSummary } from '@/services/export.service';

const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
};

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(responseAPI(401, 'ERROR', 'Unauthorized', null), {
        status: 401,
        headers: PRIVATE_NO_STORE_HEADERS,
      });
    }

    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json';
    const summaryOnly = url.searchParams.get('summary') === 'true';

    if (summaryOnly) {
      const summary = await getExportSummary(userId);
      return NextResponse.json(responseAPI(200, 'SUCCESS', 'Export summary', summary), {
        headers: PRIVATE_NO_STORE_HEADERS,
      });
    }

    const data = await exportToJSON(userId);

    if (format === 'csv') {
      const csv = exportToCSV(data.transactions);
      return new NextResponse(csv, {
        headers: {
          ...PRIVATE_NO_STORE_HEADERS,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="transactions_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // JSON format
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        ...PRIVATE_NO_STORE_HEADERS,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="finance_backup_${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(responseAPI(500, 'ERROR', 'Internal server error', null), {
      status: 500,
      headers: PRIVATE_NO_STORE_HEADERS,
    });
  }
}
