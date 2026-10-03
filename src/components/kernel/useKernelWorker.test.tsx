import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { useKernelWorker } from './useKernelWorker';

const mock = vi.hoisted(() => ({ instances: [] as Array<{ onmessage: (e: { data: unknown }) => void; postMessage: ReturnType<typeof vi.fn>; terminate: ReturnType<typeof vi.fn> }> }));
vi.mock('../../workers/kernelWorker?worker', () => ({ default: class {
  onmessage = () => {}; onerror = () => {};
  postMessage = vi.fn(); terminate = vi.fn();
  constructor() { mock.instances.push(this); }
} }));

it('copies buffers, rejects superseded/cancelled requests, ignores late messages and terminates', async () => {
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  let api!: ReturnType<typeof useKernelWorker>;
  function Probe() { api = useKernelWorker(); return null; }
  const host = document.createElement('div'), root = createRoot(host);
  await act(async () => root.render(<Probe />));
  const worker = mock.instances.at(-1)!;
  const source = new Uint8ClampedArray([50,60,70,128]);
  const params = { buffer:source.buffer,width:1,height:1,kernel:[[0,0,0],[0,1,0],[0,0,0]],channels:['r' as const],edge:'clamp' as const,normalize:false };
  let first!: Promise<unknown>, second!: Promise<unknown>;
  await act(async () => { first = api.run(params).catch(e => e.name); });
  const sent = worker.postMessage.mock.calls[0][0];
  expect(sent.buffer).not.toBe(source.buffer);
  expect([...new Uint8ClampedArray(sent.buffer)]).toEqual([...source]);
  await act(async () => { second = api.run(params).catch(e => e.name); });
  expect(await first).toBe('AbortError');
  await act(async () => worker.onmessage({data:{id:sent.id,buffer:source.buffer,width:1,height:1}}));
  expect(api.isRunning).toBe(true);
  await act(async () => api.cancel()); expect(await second).toBe('AbortError'); expect(api.isRunning).toBe(false);
  let result!: Promise<ImageData>;
  await act(async () => { result = api.run(params); });
  const latest = worker.postMessage.mock.calls.at(-1)![0];
  await act(async () => worker.onmessage({data:{id:latest.id,buffer:source.buffer,width:1,height:1}}));
  expect([...(await result).data]).toEqual([...source]);
  await act(async () => root.unmount()); expect(worker.terminate).toHaveBeenCalledTimes(1);
});

it('rejects unavailable workers and failed sends without leaving processing active', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  let api!: ReturnType<typeof useKernelWorker>;
  function Probe() { api = useKernelWorker(); return null; }
  const root = createRoot(document.createElement('div'));
  await act(async () => root.render(<Probe />));
  const worker = mock.instances.at(-1)!;
  const params = { buffer: new ArrayBuffer(4), width: 1, height: 1,
    kernel: [[0,0,0],[0,1,0],[0,0,0]], channels: ['r' as const], edge: 'clamp' as const, normalize: false };
  const sendError = new Error('Failed to send');
  worker.postMessage.mockImplementationOnce(() => { throw sendError; });
  await act(async () => {
    await expect(api.run(params)).rejects.toBe(sendError);
  });
  expect(api.isRunning).toBe(false);

  // A failed send must not block the next request; unmount still cancels it.
  let pending!: Promise<unknown>;
  await act(async () => { pending = api.run(params).catch(e => e.name); });
  expect(api.isRunning).toBe(true);
  await act(async () => root.unmount());
  expect(await pending).toBe('AbortError');
  await expect(api.run(params)).rejects.toThrow('Worker недоступен');
  expect(worker.postMessage).toHaveBeenCalledTimes(2);
});
