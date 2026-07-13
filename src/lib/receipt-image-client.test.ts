import { fitReceiptDimensions, prepareReceiptForOcr } from './receipt-image-client';

describe('receipt image resizing', () => {
  it('keeps small images unchanged', () => {
    expect(fitReceiptDimensions(900, 1200, 1600)).toEqual({ width: 900, height: 1200 });
  });

  it('scales the longest side while preserving aspect ratio', () => {
    expect(fitReceiptDimensions(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('uses the original image when browser decoding fails', async () => {
    const originalCreateImageBitmap = globalThis.createImageBitmap;
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      value: jest.fn().mockRejectedValue(new Error('Unsupported camera format')),
    });
    const file = new File([Buffer.from('image')], 'receipt.jpg', { type: 'image/jpeg' });

    try {
      await expect(prepareReceiptForOcr(file)).resolves.toBe(file);
    } finally {
      Object.defineProperty(globalThis, 'createImageBitmap', {
        configurable: true,
        value: originalCreateImageBitmap,
      });
    }
  });
});
