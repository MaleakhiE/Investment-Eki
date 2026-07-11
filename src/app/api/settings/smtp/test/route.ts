import { NextResponse } from 'next/server';
import { notFoundResponse } from '@/lib/api-response';

export async function POST() {
  return NextResponse.json(notFoundResponse(), { status: 404 });
}
