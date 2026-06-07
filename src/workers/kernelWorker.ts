import { applyKernel } from '../image/kernelFilter';
import type { EdgeStrategy, KernelChannel } from '../image/kernelFilter';

type WorkerRequest = {
  id: number;
  buffer: ArrayBuffer;
  width: number;
  height: number;
  kernel: number[][];
  channels: KernelChannel[];
  edge: EdgeStrategy;
  normalize: boolean;
};

type WorkerResponse = {
  id: number;
  buffer: ArrayBuffer;
  width: number;
  height: number;
};

type WorkerErrorResponse = {
  id: number;
  error: string;
};

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, buffer, width, height, kernel, channels, edge, normalize } = e.data;
  try {
    const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
    const result = applyKernel(imageData, kernel, channels, edge, normalize);
    const response: WorkerResponse = { id, buffer: result.data.buffer, width, height };
    (self as unknown as Worker).postMessage(response, [result.data.buffer]);
  } catch (err) {
    const errorResponse: WorkerErrorResponse = { id, error: String(err) };
    (self as unknown as Worker).postMessage(errorResponse);
  }
};
