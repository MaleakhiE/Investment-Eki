import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import {
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { getSavingsSuggestions } from '@/services/savings-suggestion.service';

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const suggestions = await getSavingsSuggestions(userId);

    return NextResponse.json(
      successResponse(suggestions, 'Saran penghematan berhasil dibuat')
    );
  } catch (error) {
    console.error('Error generating savings suggestions:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
