import {
  createOcrService,
  DEFAULT_OCR_LANGUAGES,
  DEFAULT_OCR_TIMEOUT_MS,
  getOcrCachePath,
  OcrBusyError,
  type OcrWorker,
} from './ocr.service';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('OCR service', () => {
  it('uses one Indonesian Latin OCR model and allows enough time for a serverless cold start', () => {
    expect(DEFAULT_OCR_LANGUAGES).toEqual(['ind']);
    expect(DEFAULT_OCR_TIMEOUT_MS).toBe(40_000);
  });

  it('stores downloaded language data in the writable temporary filesystem', () => {
    expect(getOcrCachePath()).toBe(join(tmpdir(), 'investment-ocr'));
  });

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

  it('rejects a concurrent scan instead of retaining it in an unbounded queue', async () => {
    let finishRecognition!: (result: { data: { text: string } }) => void;
    const worker: OcrWorker = {
      recognize: jest.fn()
        .mockImplementationOnce(() => new Promise((resolve) => {
          finishRecognition = resolve;
        }))
        .mockResolvedValueOnce({ data: { text: 'TOTAL 20.000' } }),
    };
    const workerFactory = jest.fn().mockResolvedValue(worker);
    const service = createOcrService(workerFactory);
    expect(typeof service.isBusy).toBe('function');

    const activeScan = service.recognize(Buffer.from('first'));
    expect(service.isBusy()).toBe(true);
    await Promise.resolve();
    const concurrentOutcome = service.recognize(Buffer.from('second'))
      .then((value) => ({ value, error: null }), (error: unknown) => ({ value: null, error }));
    const earlyOutcome = await Promise.race([
      concurrentOutcome,
      new Promise<'pending'>((resolve) => setTimeout(() => resolve('pending'), 1)),
    ]);
    finishRecognition({ data: { text: 'TOTAL 10.000' } });
    await expect(activeScan).resolves.toBe('TOTAL 10.000');
    await concurrentOutcome;

    expect(earlyOutcome).toEqual({ value: null, error: expect.any(OcrBusyError) });
    expect(service.isBusy()).toBe(false);
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
    await new Promise((resolve) => setTimeout(resolve, 0));

    worker.recognize = jest.fn().mockResolvedValue({ data: { text: 'TOTAL 10.000' } });
    await service.recognize(Buffer.from('retry'));
    expect(workerFactory).toHaveBeenCalledTimes(2);
  });

  it('times out worker initialization and disposes it if it finishes late', async () => {
    const finishInitialization: Array<(worker: OcrWorker) => void> = [];
    const worker: OcrWorker = {
      recognize: jest.fn().mockResolvedValue({ data: { text: 'TOTAL 10.000' } }),
      terminate: jest.fn().mockResolvedValue(undefined),
    };
    const workerFactory = jest.fn(() => new Promise<OcrWorker>((resolve) => {
      finishInitialization.push(resolve);
    }));
    const service = createOcrService(workerFactory, 5);

    await expect(service.recognize(Buffer.from('slow-start'))).rejects.toThrow('OCR timed out');
    const retryOutcome = service.recognize(Buffer.from('retry-too-soon'))
      .then((value) => ({ value, error: null }), (error: unknown) => ({ value: null, error }));
    await Promise.resolve();
    const factoryCallsBeforeCleanup = workerFactory.mock.calls.length;

    finishInitialization.forEach((resolve) => resolve(worker));
    const retryResult = await retryOutcome;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(factoryCallsBeforeCleanup).toBe(1);
    expect(retryResult).toEqual({ value: null, error: expect.any(OcrBusyError) });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('quarantines a timed-out worker until termination finishes', async () => {
    let finishTermination!: () => void;
    const timedOutWorker: OcrWorker = {
      recognize: jest.fn(() => new Promise(() => undefined)),
      terminate: jest.fn(() => new Promise<void>((resolve) => {
        finishTermination = resolve;
      })),
    };
    const replacementWorker: OcrWorker = {
      recognize: jest.fn().mockResolvedValue({ data: { text: 'TOTAL 25.000' } }),
      terminate: jest.fn().mockResolvedValue(undefined),
    };
    const workerFactory = jest.fn()
      .mockResolvedValueOnce(timedOutWorker)
      .mockResolvedValueOnce(replacementWorker);
    const service = createOcrService(workerFactory, 5);

    await expect(service.recognize(Buffer.from('slow'))).rejects.toThrow('OCR timed out');
    await expect(service.recognize(Buffer.from('retry-too-soon'))).rejects.toBeInstanceOf(OcrBusyError);
    expect(workerFactory).toHaveBeenCalledTimes(1);

    finishTermination();
    await new Promise((resolve) => setTimeout(resolve, 0));

    await expect(service.recognize(Buffer.from('retry'))).resolves.toBe('TOTAL 25.000');
    expect(workerFactory).toHaveBeenCalledTimes(2);
    expect(replacementWorker.recognize).toHaveBeenCalledTimes(1);
  });
});
