import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { createAccount, getAccounts, type AccountInput, type AccountRecord } from '@/services/account.service';
import { serverErrorResponse, successResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/api-response';
import { safeDatabaseErrorCode } from '@/lib/error-safety';

function serializeAccount({ user_id: internalUserId, ...account }: AccountRecord) {
  void internalUserId;
  return { ...account, id: account.id.toString() };
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json(unauthorizedResponse(), { status: 401 });

    const accounts = await getAccounts(userId);
    return NextResponse.json(successResponse(accounts.map(serializeAccount), 'Accounts retrieved successfully'));
  } catch (error) {
    console.error('Error getting accounts:', { code: safeDatabaseErrorCode(error) });
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json(unauthorizedResponse(), { status: 401 });

    let body: AccountInput;
    try { body = await request.json(); }
    catch { return NextResponse.json(validationErrorResponse(['Invalid JSON body']), { status: 400 }); }

    const result = await createAccount(userId, body);
    if (!result.success || !result.account) {
      return NextResponse.json(validationErrorResponse([result.error || 'Failed to create account']), { status: 400 });
    }

    return NextResponse.json(
      successResponse(serializeAccount(result.account), 'Account created successfully', 201),
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating account:', { code: safeDatabaseErrorCode(error) });
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
