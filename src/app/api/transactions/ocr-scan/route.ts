import { NextRequest, NextResponse } from 'next/server';

import {
  serverErrorResponse,
  errorResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/api-response';
import { getCurrentUserId } from '@/lib/auth';
import { parseReceiptText } from '@/lib/receipt-parser';
import { hasMatchingImageSignature, MAX_RECEIPT_BYTES, RECEIPT_IMAGE_TYPES } from '@/lib/receipt-image';
import { isReceiptOcrBusy, recognizeReceipt } from '@/services/ocr.service';

export const runtime = 'nodejs';
export const maxDuration = 60;

function validationResponse(message: string) {
  return NextResponse.json(validationErrorResponse([message]), { status: 400 });
}

function busyResponse() {
  return NextResponse.json(
    errorResponse('Another receipt is being scanned. Try again shortly.', 429),
    { status: 429 },
  );
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }
    if (isReceiptOcrBusy()) return busyResponse();

    if (!request.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data')) {
      return validationResponse('Content-Type must be multipart/form-data');
    }
    const contentLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_RECEIPT_BYTES + 64 * 1024) {
      return validationResponse('Request body is too large');
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return validationResponse('Invalid multipart form data');
    }

    const image = formData.get('image');
    if (!(image instanceof Blob)) return validationResponse('Image is required');
    if (!RECEIPT_IMAGE_TYPES.has(image.type)) {
      return validationResponse('Image must be a JPEG, PNG, or WebP file');
    }
    if (image.size > MAX_RECEIPT_BYTES) return validationResponse('Image must not exceed 5 MiB');
    if (image.size === 0) return validationResponse('Image must not be empty');

    const buffer = Buffer.from(await image.arrayBuffer());
    if (!hasMatchingImageSignature(image.type, buffer)) {
      return validationResponse('Image content does not match its declared file type');
    }
    const rawText = await recognizeReceipt(buffer);
    const parsed = parseReceiptText(rawText);
    const receiptImage = `data:${image.type};base64,${buffer.toString('base64')}`;

    return NextResponse.json(successResponse(
      { ...parsed, receipt_image: receiptImage },
      'Receipt scanned successfully',
    ));
  } catch (error) {
    console.error('Error scanning receipt:', error);
    if (error instanceof Error && error.name === 'OcrTimeoutError') {
      return NextResponse.json(
        errorResponse('Receipt scan timed out. Try a clearer or smaller image.', 504),
        { status: 504 },
      );
    }
    if (error instanceof Error && error.name === 'OcrBusyError') {
      return busyResponse();
    }
    return NextResponse.json(serverErrorResponse('Unable to scan receipt'), { status: 500 });
  }
}
