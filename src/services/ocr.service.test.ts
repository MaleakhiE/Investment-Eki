import { createOcrService, type OcrWorker } from './ocr.service';

describe('OCR service', () => {
  it('lazily creates one worker and reuses it for subsequent scans', async () => {
    const worker: OcrWorker = {
      recognize: jest.fn().mockResolvedValue({ data: { text: 'TOKO MAJU\nTOTAL 10.000' } }),
    };
    const workerFactory = jest.fn().mockResolvedValue(worker);
    const service = createOcrService(workerFactory);

    await service.recognize(Buffer.from('first'));
    await service.recognize(Buffer.from('second'));

    expect(workerFactory).toHaveBeenCalledTimes(1);
    expect(worker.recognize).toHaveBeenCalledTimes(2);
  });

  it('shares an in-flight worker initialization between concurrent scans', async () => {
    const worker: OcrWorker = {
      recognize: jest.fn().mockResolvedValue({ data: { text: 'TOTAL 10.000' } }),
    };
    const workerFactory = jest.fn().mockResolvedValue(worker);
    const service = createOcrService(workerFactory);

    await Promise.all([
      service.recognize(Buffer.from('first')),
      service.recognize(Buffer.from('second')),
    ]);

    expect(workerFactory).toHaveBeenCalledTimes(1);
  });
});
