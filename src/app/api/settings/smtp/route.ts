import { NextResponse } from 'next/server';
import { errorResponse, notFoundResponse } from '@/lib/api-response';

export async function GET() {
  return NextResponse.json(notFoundResponse(), { status: 404 });
}

export async function POST() {
  return NextResponse.json(errorResponse('SMTP configuration is managed globally', 405), { status: 405, headers: { Allow: '' } });
}

export async function DELETE() {
  return NextResponse.json(errorResponse('SMTP configuration is managed globally', 405), { status: 405, headers: { Allow: '' } });
}
