const OCR_MAX_SIDE = 1600;

export function fitReceiptDimensions(width: number, height: number, maxSide: number) {
  const longestSide = Math.max(width, height);
  if (longestSide <= maxSide) return { width, height };
  const scale = maxSide / longestSide;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function prepareReceiptForOcr(file: File): Promise<File> {
  if (typeof createImageBitmap !== 'function') return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  try {
    const dimensions = fitReceiptDimensions(bitmap.width, bitmap.height, OCR_MAX_SIDE);
    if (dimensions.width === bitmap.width && dimensions.height === bitmap.height && file.size <= 1_500_000) return file;

    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.84));
    return blob ? new File([blob], 'receipt-ocr.jpg', { type: 'image/jpeg' }) : file;
  } finally {
    bitmap.close();
  }
}
