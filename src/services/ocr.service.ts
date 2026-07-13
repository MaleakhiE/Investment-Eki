import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface OcrWorker {
  recognize(image: Buffer): Promise<{ data: { text: string } }>;
  terminate?(): Promise<unknown>;
}

export type OcrWorkerFactory = () => Promise<OcrWorker>;

export const DEFAULT_OCR_LANGUAGES = ['ind'] as const;
export const DEFAULT_OCR_TIMEOUT_MS = 40_000;

export function getOcrCachePath() {
  return join(tmpdir(), 'investment-ocr');
}

async function createTesseractWorker(): Promise<OcrWorker> {
  const { createWorker } = await import('tesseract.js');
  const cachePath = getOcrCachePath();
  await mkdir(cachePath, { recursive: true });
  let previousStatus = '';
  return createWorker([...DEFAULT_OCR_LANGUAGES], 1, {
    cachePath,
    logger(message) {
      if (message.status !== previousStatus) {
        previousStatus = message.status;
        console.info(`[ocr] ${message.status}`);
      }
    },
  }) as Promise<OcrWorker>;
}

export class OcrTimeoutError extends Error {
  constructor() {
    super('OCR timed out');
    this.name = 'OcrTimeoutError';
  }
}

export class OcrBusyError extends Error {
  constructor() {
    super('OCR is busy');
    this.name = 'OcrBusyError';
  }
}

export function createOcrService(
  workerFactory: OcrWorkerFactory = createTesseractWorker,
  timeoutMs = DEFAULT_OCR_TIMEOUT_MS,
) {
  let workerPromise: Promise<OcrWorker> | null = null;
  let activeJob = false;
  let cleanupPromise: Promise<void> | null = null;

  const getWorker = (): Promise<OcrWorker> => {
    workerPromise ??= workerFactory().catch((error) => {
      workerPromise = null;
      throw error;
    });
    return workerPromise;
  };

  const retireWorker = (pendingWorker: Promise<OcrWorker>) => {
    const cleanup = pendingWorker
      .then((worker) => worker.terminate?.())
      .catch(() => undefined)
      .then(() => undefined)
      .finally(() => {
        if (workerPromise === pendingWorker) workerPromise = null;
        if (cleanupPromise === cleanup) cleanupPromise = null;
      });
    cleanupPromise = cleanup;
  };

  return {
    isBusy() {
      return activeJob || cleanupPromise !== null;
    },

    async recognize(image: Buffer): Promise<string> {
      if (activeJob || cleanupPromise) throw new OcrBusyError();

      activeJob = true;
      try {
        const pendingWorker = getWorker();
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          const result = await Promise.race([
            pendingWorker.then((worker) => worker.recognize(image)),
            new Promise<never>((_, reject) => {
              timeout = setTimeout(() => reject(new OcrTimeoutError()), timeoutMs);
            }),
          ]);
          return result.data.text;
        } catch (error) {
          if (error instanceof OcrTimeoutError) {
            retireWorker(pendingWorker);
          }
          throw error;
        } finally {
          if (timeout) clearTimeout(timeout);
        }
      } finally {
        activeJob = false;
      }
    },
  };
}

const defaultOcrService = createOcrService();

export function isReceiptOcrBusy(): boolean {
  return defaultOcrService.isBusy();
}

export function recognizeReceipt(image: Buffer): Promise<string> {
  return defaultOcrService.recognize(image);
}
