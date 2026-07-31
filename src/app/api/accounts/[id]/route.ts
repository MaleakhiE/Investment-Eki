import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { archiveAccount, updateAccount, type AccountInput, type AccountRecord } from '@/services/account.service';
import { notFoundResponse, serverErrorResponse, successResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseDatabaseId } from '@/lib/database-id';

interface RouteParams { params: Promise<{ id: string }> }

function serializeAccount({ user_id: internalUserId, ...account }: AccountRecord) {
  void internalUserId;
  return { ...account, id: account.id.toString() };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json(unauthorizedResponse(), { status: 401 });
    const accountId = parseDatabaseId((await params).id);
    if (!accountId) return NextResponse.json(validationErrorResponse(['Invalid account ID']), { status: 400 });

    let body: AccountInput;
    try { body = await request.json(); }
    catch { return NextResponse.json(validationErrorResponse(['Invalid JSON body']), { status: 400 }); }

    const result = await updateAccount(userId, accountId, body);
    if (!result.success || !result.account) {
      if (result.error === 'Account not found') return NextResponse.json(notFoundResponse('Account not found'), { status: 404 });
      return NextResponse.json(validationErrorResponse([result.error || 'Failed to update account']), { status: 400 });
    }
    return NextResponse.json(successResponse(serializeAccount(result.account), 'Account updated successfully'));
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json(unauthorizedResponse(), { status: 401 });
    const accountId = parseDatabaseId((await params).id);
    if (!accountId) return NextResponse.json(validationErrorResponse(['Invalid account ID']), { status: 400 });

    const result = await archiveAccount(userId, accountId);
    if (!result.success) return NextResponse.json(notFoundResponse(result.error || 'Account not found'), { status: 404 });
    return NextResponse.json(successResponse(null, 'Account archived successfully'));
  } catch (error) {
    console.error('Error archiving account:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
