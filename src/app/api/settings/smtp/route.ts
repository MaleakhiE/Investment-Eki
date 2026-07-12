import { NextResponse } from 'next/server';
import { notFoundResponse } from '@/lib/api-response';
export async function GET() { return NextResponse.json(notFoundResponse(), { status: 404 }); }
export async function POST() { return NextResponse.json(notFoundResponse(), { status: 404 }); }
export async function PUT() { return NextResponse.json(notFoundResponse(), { status: 404 }); }
export async function DELETE() { return NextResponse.json(notFoundResponse(), { status: 404 }); }
