const getCurrentUserId = jest.fn();
const recognizeReceipt = jest.fn();

jest.mock('@/lib/auth', () => ({ getCurrentUserId }));
jest.mock('@/services/ocr.service', () => ({ recognizeReceipt }));

import { maxDuration, POST, runtime } from './route';

const makeRequest = (body: FormData, contentType?: string) => new Request(
  'http://localhost/api/transactions/ocr-scan',
  { method: 'POST', body, headers: contentType ? { 'content-type': contentType } : undefined },
) as never;

beforeEach(() => {
  jest.clearAllMocks();
  getCurrentUserId.mockResolvedValue(BigInt(20));
  recognizeReceipt.mockResolvedValue('TOKO MAJU\nTanggal 11/07/2026\nTOTAL Rp 125.000');
});

describe('POST /api/transactions/ocr-scan', () => {
  it('uses the Node.js runtime', () => {
    expect(runtime).toBe('nodejs');
    expect(maxDuration).toBe(30);
  });

  it('rejects unauthenticated requests before reading the upload', async () => {
    getCurrentUserId.mockResolvedValue(null);
    const response = await POST(makeRequest(new FormData()));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual(expect.objectContaining({
      responseCode: 401,
      responseStatus: 'ERROR',
      responseDetails: null,
    }));
    expect(recognizeReceipt).not.toHaveBeenCalled();
  });

  it('recognizes a valid image and returns parsed guesses plus its data URL', async () => {
    const form = new FormData();
    form.set('image', new File([Buffer.from([0xff, 0xd8, 0xff, 0x00])], 'receipt.jpg', { type: 'image/jpeg' }));

    const response = await POST(makeRequest(form));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(recognizeReceipt).toHaveBeenCalledWith(expect.any(Buffer));
    expect(body).toEqual({
      responseCode: 200,
      responseStatus: 'SUCCESS',
      responseMessage: 'Receipt scanned successfully',
      responseDetails: {
        amount: 125_000,
        date: '2026-07-11',
        merchant: 'TOKO MAJU',
        categoryGuess: 'Other',
        receipt_image: 'data:image/jpeg;base64,/9j/AA==',
      },
    });
  });

  it('rejects content whose signature does not match its declared image type', async () => {
    const form = new FormData();
    form.set('image', new File(['not-jpeg'], 'receipt.jpg', { type: 'image/jpeg' }));
    const response = await POST(makeRequest(form));
    expect(response.status).toBe(400);
    expect(recognizeReceipt).not.toHaveBeenCalled();
  });

  it.each(['image/gif', 'image/svg+xml', 'text/plain'])('rejects unsafe MIME type %s', async (type) => {
    const form = new FormData();
    form.set('image', new File(['payload'], 'receipt', { type }));

    const response = await POST(makeRequest(form));

    expect(response.status).toBe(400);
    expect((await response.json()).responseDetails.errors).toContain(
      'Image must be a JPEG, PNG, or WebP file',
    );
    expect(recognizeReceipt).not.toHaveBeenCalled();
  });

  it('rejects images larger than 5 MiB', async () => {
    const form = new FormData();
    form.set('image', new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }));

    const response = await POST(makeRequest(form));

    expect(response.status).toBe(400);
    expect((await response.json()).responseDetails.errors).toContain('Image must not exceed 5 MiB');
    expect(recognizeReceipt).not.toHaveBeenCalled();
  });

  it('rejects requests without an image part', async () => {
    const response = await POST(makeRequest(new FormData()));
    expect(response.status).toBe(400);
    expect((await response.json()).responseDetails.errors).toContain('Image is required');
  });

  it('returns a standard server-error envelope when OCR fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    recognizeReceipt.mockRejectedValue(new Error('worker failed'));
    const form = new FormData();
    form.set('image', new File([Buffer.from('RIFF0000WEBP')], 'receipt.webp', { type: 'image/webp' }));

    const response = await POST(makeRequest(form));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      responseCode: 500,
      responseStatus: 'ERROR',
      responseMessage: 'Unable to scan receipt',
      responseDetails: null,
    });
    expect(consoleError).toHaveBeenCalledWith('Error scanning receipt:', expect.any(Error));
    consoleError.mockRestore();
  });

  it('returns a retryable timeout response when OCR exceeds its deadline', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    recognizeReceipt.mockRejectedValue(Object.assign(new Error('OCR timed out'), { name: 'OcrTimeoutError' }));
    const form = new FormData();
    form.set('image', new File([Buffer.from('RIFF0000WEBP')], 'receipt.webp', { type: 'image/webp' }));

    const response = await POST(makeRequest(form));

    expect(response.status).toBe(504);
    expect((await response.json()).responseMessage).toBe('Receipt scan timed out. Try a clearer or smaller image.');
    consoleError.mockRestore();
  });
});
