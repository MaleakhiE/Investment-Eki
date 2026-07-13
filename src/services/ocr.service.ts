export interface OcrWorker {
  recognize(image: Buffer): Promise<{ data: { text: string } }>;
  terminate?(): Promise<unknown>;
}

export type OcrWorkerFactory = () => Promise<OcrWorker>;

async function createTesseractWorker(): Promise<OcrWorker> {
  const { createWorker } = await import('tesseract.js');
  let previousStatus = '';
  return createWorker(['ind', 'eng'], 1, {
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

export function createOcrService(workerFactory: OcrWorkerFactory = createTesseractWorker, timeoutMs = 20_000) {
  let workerPromise: Promise<OcrWorker> | null = null;
  let jobQueue: Promise<void> = Promise.resolve();

  const getWorker = (): Promise<OcrWorker> => {
    workerPromise ??= workerFactory().catch((error) => {
      workerPromise = null;
      throw error;
    });
    return workerPromise;
  };

  return {
    async recognize(image: Buffer): Promise<string> {
      const previousJob = jobQueue;
      let releaseJob!: () => void;
      jobQueue = new Promise<void>((resolve) => {
        releaseJob = resolve;
      });

      await previousJob;
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
            if (workerPromise === pendingWorker) workerPromise = null;
            void pendingWorker
              .then((worker) => worker.terminate?.())
              .catch(() => undefined);
          }
          throw error;
        } finally {
          if (timeout) clearTimeout(timeout);
        }
      } finally {
        releaseJob();
      }
    },
  };
}

const defaultOcrService = createOcrService();

export function recognizeReceipt(image: Buffer): Promise<string> {
  return defaultOcrService.recognize(image);
}
