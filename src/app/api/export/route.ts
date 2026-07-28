import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import {
  notFoundResponse,
  responseAPI,
  validationErrorResponse,
} from '@/lib/api-response';
import {
  ExportAccountNotFoundError,
  exportToCSV,
  exportToJSON,
  exportTransactions,
  getExportSummary,
} from '@/services/export.service';

const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
};
const MAX_SIGNED_BIGINT = BigInt('9223372036854775807');

function parseDate(value: string | null, field: 'from' | 'to'): Date | string | undefined {
  if (value === null) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1000-01-01') {
    return `${field} must be a valid YYYY-MM-DD date`;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return `${field} must be a valid YYYY-MM-DD date`;
  }
  return date;
}

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
    const fromValue = url.searchParams.get('from');
    const toValue = url.searchParams.get('to');
    const accountIdValue = url.searchParams.get('accountId');
    const hasFilters = fromValue !== null || toValue !== null || accountIdValue !== null;
    const errors: string[] = [];

    if (summaryOnly && hasFilters) {
      errors.push('filters are not supported for export summaries');
    } else if (format !== 'json' && format !== 'csv') {
      errors.push('format must be json or csv');
    } else if (hasFilters && format !== 'csv') {
      errors.push('filters are supported for CSV exports only');
    }

    const from = parseDate(fromValue, 'from');
    const to = parseDate(toValue, 'to');
    if (typeof from === 'string') errors.push(from);
    if (typeof to === 'string') errors.push(to);

    let accountId: bigint | undefined;
    if (accountIdValue !== null) {
      if (!/^[1-9]\d{0,18}$/.test(accountIdValue)) {
        errors.push('accountId must be a positive integer');
      } else {
        const parsedAccountId = BigInt(accountIdValue);
        if (parsedAccountId > MAX_SIGNED_BIGINT) {
          errors.push('accountId must be a positive integer');
        } else {
          accountId = parsedAccountId;
        }
      }
    }

    if (from instanceof Date && to instanceof Date && from > to) {
      errors.push('from must be on or before to');
    }

    if (errors.length > 0) {
      return NextResponse.json(validationErrorResponse(errors), {
        status: 400,
        headers: PRIVATE_NO_STORE_HEADERS,
      });
    }

    if (summaryOnly) {
      const summary = await getExportSummary(userId);
      return NextResponse.json(responseAPI(200, 'SUCCESS', 'Export summary', summary), {
        headers: PRIVATE_NO_STORE_HEADERS,
      });
    }

    if (format === 'csv') {
      const transactions = await exportTransactions(userId, {
        ...(from instanceof Date && { from }),
        ...(to instanceof Date && { to }),
        ...(accountId !== undefined && { accountId }),
      });
      const csv = exportToCSV(transactions);
      return new NextResponse(csv, {
        headers: {
          ...PRIVATE_NO_STORE_HEADERS,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="transactions_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    const data = await exportToJSON(userId);
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        ...PRIVATE_NO_STORE_HEADERS,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="fintrack_data_export_${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    if (error instanceof ExportAccountNotFoundError) {
      return NextResponse.json(notFoundResponse('Account not found'), {
        status: 404,
        headers: PRIVATE_NO_STORE_HEADERS,
      });
    }
    console.error('Export error:', error);
    return NextResponse.json(responseAPI(500, 'ERROR', 'Internal server error', null), {
      status: 500,
      headers: PRIVATE_NO_STORE_HEADERS,
    });
  }
}
