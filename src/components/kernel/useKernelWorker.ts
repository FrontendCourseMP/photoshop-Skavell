import { useRef, useState, useEffect, useCallback } from 'react';
import type { EdgeStrategy, KernelChannel } from '../../image/kernelFilter';
import KernelWorker from '../../workers/kernelWorker?worker';

type RunParams = {
  buffer: ArrayBuffer;
  width: number;
  height: number;
  kernel: number[][];
  channels: KernelChannel[];
  edge: EdgeStrategy;
  normalize: boolean;
};

type WorkerOutgoing =
  | { id: number; buffer: ArrayBuffer; width: number; height: number }
  | { id: number; error: string };

export function useKernelWorker(): {
  run: (params: RunParams) => Promise<ImageData>;
  isRunning: boolean;
} {
  const workerRef = useRef<Worker | null>(null);
  const seqRef = useRef<number>(0);
  const lastSeqRef = useRef<number>(0);
  const pendingResolveRef = useRef<((img: ImageData) => void) | null>(null);
  const pendingRejectRef = useRef<((e: unknown) => void) | null>(null);

  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const worker = new KernelWorker();
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const data = e.data as WorkerOutgoing;
      if (data.id !== lastSeqRef.current) return;

      const resolve = pendingResolveRef.current;
      const reject = pendingRejectRef.current;
      pendingResolveRef.current = null;
      pendingRejectRef.current = null;
      setIsRunning(false);

      if ('error' in data) {
        reject?.(new Error(data.error));
      } else {
        const imageData = new ImageData(
          new Uint8ClampedArray(data.buffer),
          data.width,
          data.height,
        );
        resolve?.(imageData);
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const run = useCallback((params: RunParams): Promise<ImageData> => {
    seqRef.current += 1;
    const id = seqRef.current;
    lastSeqRef.current = id;

    if (pendingRejectRef.current !== null) {
      pendingRejectRef.current(new DOMException('cancelled', 'AbortError'));
    }

    return new Promise<ImageData>((resolve, reject) => {
      pendingResolveRef.current = resolve;
      pendingRejectRef.current = reject;
      setIsRunning(true);

      const sendBuffer = params.buffer.slice(0);
      workerRef.current!.postMessage(
        { ...params, id, buffer: sendBuffer },
        [sendBuffer],
      );
    });
  }, []);

  return { run, isRunning };
}
