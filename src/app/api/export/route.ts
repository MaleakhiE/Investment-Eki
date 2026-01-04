import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { responseAPI } from '@/lib/api-response';
import { exportToJSON, exportToCSV, getExportSummary } from '@/services/export.service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(responseAPI(401, 'ERROR', 'Unauthorized', null), { status: 401 });
    }

    const userId = BigInt(session.user.id);
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json';
    const summaryOnly = url.searchParams.get('summary') === 'true';

    if (summaryOnly) {
      const summary = await getExportSummary(userId);
      return NextResponse.json(responseAPI(200, 'SUCCESS', 'Export summary', summary));
    }

    const data = await exportToJSON(userId);

    if (format === 'csv') {
      const csv = exportToCSV(data.transactions);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="transactions_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // JSON format
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="finance_backup_${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(responseAPI(500, 'ERROR', 'Internal server error', null), { status: 500 });
  }
}
