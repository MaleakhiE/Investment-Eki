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

  it('terminates and resets a worker when recognition times out', async () => {
    const worker: OcrWorker = {
      recognize: jest.fn(() => new Promise(() => undefined)),
      terminate: jest.fn().mockResolvedValue(undefined),
    };
    const workerFactory = jest.fn().mockResolvedValue(worker);
    const service = createOcrService(workerFactory, 5);

    await expect(service.recognize(Buffer.from('slow'))).rejects.toThrow('OCR timed out');
    expect(worker.terminate).toHaveBeenCalledTimes(1);

    worker.recognize = jest.fn().mockResolvedValue({ data: { text: 'TOTAL 10.000' } });
    await service.recognize(Buffer.from('retry'));
    expect(workerFactory).toHaveBeenCalledTimes(2);
  });

  it('times out worker initialization and disposes it if it finishes late', async () => {
    let finishInitialization!: (worker: OcrWorker) => void;
    const worker: OcrWorker = {
      recognize: jest.fn().mockResolvedValue({ data: { text: 'TOTAL 10.000' } }),
      terminate: jest.fn().mockResolvedValue(undefined),
    };
    const workerFactory = jest.fn(() => new Promise<OcrWorker>((resolve) => {
      finishInitialization = resolve;
    }));
    const service = createOcrService(workerFactory, 5);

    await expect(service.recognize(Buffer.from('slow-start'))).rejects.toThrow('OCR timed out');
    finishInitialization(worker);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('isolates a queued scan when the active scan times out', async () => {
    const timedOutWorker: OcrWorker = {
      recognize: jest.fn(() => new Promise(() => undefined)),
      terminate: jest.fn().mockResolvedValue(undefined),
    };
    const replacementWorker: OcrWorker = {
      recognize: jest.fn().mockResolvedValue({ data: { text: 'TOTAL 25.000' } }),
      terminate: jest.fn().mockResolvedValue(undefined),
    };
    const workerFactory = jest.fn()
      .mockResolvedValueOnce(timedOutWorker)
      .mockResolvedValueOnce(replacementWorker);
    const service = createOcrService(workerFactory, 5);

    const activeScan = service.recognize(Buffer.from('slow'));
    const queuedScan = service.recognize(Buffer.from('fast'));

    await expect(activeScan).rejects.toThrow('OCR timed out');
    await expect(queuedScan).resolves.toBe('TOTAL 25.000');
    expect(workerFactory).toHaveBeenCalledTimes(2);
    expect(replacementWorker.recognize).toHaveBeenCalledTimes(1);
  });
});
