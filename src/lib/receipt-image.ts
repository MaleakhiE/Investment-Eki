export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
export const RECEIPT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function hasMatchingImageSignature(mimeType: string, bytes: Buffer): boolean {
  if (mimeType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === 'image/webp') {
    return bytes.subarray(0, 4).equals(Buffer.from([0x52, 0x49, 0x46, 0x46]))
      && bytes.subarray(8, 12).equals(Buffer.from([0x57, 0x45, 0x42, 0x50]));
  }
  return false;
}

export function isSupportedReceiptDataUrl(value: string): boolean {
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return false;
  const bytes = Buffer.from(match[2], 'base64');
  return bytes.length > 0
    && bytes.length <= MAX_RECEIPT_BYTES
    && hasMatchingImageSignature(match[1], bytes);
}
