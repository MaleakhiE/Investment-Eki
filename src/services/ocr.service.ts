export interface OcrWorker {
  recognize(image: Buffer): Promise<{ data: { text: string } }>;
}

export type OcrWorkerFactory = () => Promise<OcrWorker>;

async function createTesseractWorker(): Promise<OcrWorker> {
  const { createWorker } = await import('tesseract.js');
  return createWorker(['ind', 'eng']) as Promise<OcrWorker>;
}

export function createOcrService(workerFactory: OcrWorkerFactory = createTesseractWorker) {
  let workerPromise: Promise<OcrWorker> | null = null;

  const getWorker = (): Promise<OcrWorker> => {
    workerPromise ??= workerFactory().catch((error) => {
      workerPromise = null;
      throw error;
    });
    return workerPromise;
  };

  return {
    async recognize(image: Buffer): Promise<string> {
      const worker = await getWorker();
      const result = await worker.recognize(image);
      return result.data.text;
    },
  };
}

const defaultOcrService = createOcrService();

export function recognizeReceipt(image: Buffer): Promise<string> {
  return defaultOcrService.recognize(image);
}
