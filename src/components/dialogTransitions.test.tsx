import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LevelsDialog } from './levels/LevelsDialog';
import { KernelDialog } from './kernel/KernelDialog';
import { gb7Model } from '../image/channelModel';
import { applyKernel } from '../image/kernelFilter';
import { applyChannelFilter } from '../image/channelFilter';

// Replace chart layout and slider geometry only; exercise real dialog state/effects/actions.
vi.mock('recharts', () => ({
  ResponsiveContainer: () => null, BarChart: () => null, Bar: () => null,
  XAxis: () => null, YAxis: () => null, Tooltip: () => null,
}));
vi.mock('@mui/material/Slider', () => ({ default: (props: { value: number[]; onChange: (event: Event, values: number[], index: number) => void }) => (
  <div>{props.value.map((value, index) => <input key={index} aria-label={`marker-${index}`} value={value} onChange={e => {
    const values = [...props.value]; values[index] = Number(e.target.value);
    props.onChange(e.nativeEvent, values, index);
  }} />)}</div>
) }));
const worker = vi.hoisted(() => ({ run: vi.fn(), cancel: vi.fn() }));
vi.mock('./kernel/useKernelWorker', () => ({ useKernelWorker: () => ({ ...worker, isRunning: false }) }));

let root: Root;
let host: HTMLDivElement;
let frames: Map<number, FrameRequestCallback>;
let nextFrame = 0;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  frames = new Map();
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frames.set(++nextFrame, fn); return nextFrame; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  worker.run.mockReset(); worker.cancel.mockReset();
  worker.run.mockImplementation(async p => applyKernel(new ImageData(new Uint8ClampedArray(p.buffer),p.width,p.height),p.kernel,p.channels,p.edge,p.normalize));
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
async function flush() { await act(async () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(0)); }); }
async function click(label: string) {
  const button = [...document.querySelectorAll('button')].find(el => el.textContent === label);
  if (!button) throw new Error(`Missing button ${label}`);
  await act(async () => button.click());
}
async function input(selector: string, value: number | string) {
  const element = document.querySelector<HTMLInputElement>(selector)!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(element,String(value));
    element.dispatchEvent(new Event('input',{bubbles:true}));
  });
}
async function checkbox(label: string) {
  const element = [...document.querySelectorAll('label')].find(el => el.textContent === label)!.querySelector('input')!;
  await act(async () => element.click());
}
const src = () => new ImageData(new Uint8ClampedArray([64,64,64,128]),1,1);
const active = {r:true,g:true,b:true,a:false};
function props() {
  const originalImageData = src();
  return { open:true, originalImageData, channelModel:gb7Model(true), activeChannels:active,
    snapshotImageData:applyChannelFilter(originalImageData,active), onPreview:vi.fn(), onApply:vi.fn(), onClose:vi.fn() };
}
const last = (mock: ReturnType<typeof vi.fn>) => mock.mock.calls.at(-1)![0] as ImageData;
describe('Levels user transitions', () => {
  it('Master → Gray → Master keeps independent settings; Reset stays open; Cancel restores snapshot', async () => {
    const p = props(); await act(async () => root.render(<LevelsDialog {...p} />)); await flush();
    expect(document.body.textContent).not.toMatch(/\bR\b/);
    await input('[aria-label="marker-2"]',100);
    await click('Gray'); await input('[aria-label="marker-0"]',20);
    await click('Master');
    expect(document.body.textContent).toContain('Белая: 100'); expect(document.body.textContent).toContain('Чёрная: 0');
    await click('Gray'); expect(document.body.textContent).toContain('Чёрная: 20');
    await flush(); expect(last(p.onPreview).data[3]).toBe(255);
    await checkbox('Preview'); expect(last(p.onPreview)).toBe(p.snapshotImageData);
    await click('Сброс'); expect(p.onClose).not.toHaveBeenCalled(); expect(document.body.textContent).toContain('Белая: 127');
    await checkbox('Preview'); await click('Отмена'); await flush();
    expect(last(p.onPreview)).toBe(p.snapshotImageData); expect(p.onApply).not.toHaveBeenCalled();
  });
  it('Apply without Preview commits once; reopening with neutral settings does not apply twice', async () => {
    const p = props(); await act(async () => root.render(<LevelsDialog {...p} />)); await flush();
    await checkbox('Preview'); await input('[aria-label="marker-2"]',64);
    await click('Применить'); await click('Применить'); await flush();
    expect(p.onApply).toHaveBeenCalledTimes(1); expect(last(p.onApply).data).toEqual(new Uint8ClampedArray([127,127,127,128]));
    const confirmed = last(p.onApply);
    await act(async () => root.render(<LevelsDialog key="reopen" {...p} originalImageData={confirmed} />));
    await click('Применить'); expect(last(p.onApply).data).toEqual(confirmed.data);
  });
  it('Preview and Apply produce the same visible pixels, even with alpha hidden', async () => {
    const p = props(); await act(async () => root.render(<LevelsDialog {...p} />)); await flush();
    await input('[aria-label="marker-2"]',64); await flush(); const preview = last(p.onPreview);
    await click('Применить');
    expect(preview.data).toEqual(applyChannelFilter(last(p.onApply),active).data);
  });
  it('colliding black/white markers still leave a strictly positive interval', async () => {
    const p = props(); await act(async () => root.render(<LevelsDialog {...p} />));
    await input('[aria-label="marker-0"]',127); await input('[aria-label="marker-2"]',126); await flush();
    expect(document.body.textContent).toContain('Чёрная: 126'); expect(document.body.textContent).toContain('Белая: 127');
  });
});
describe('Kernel user transitions and stale results', () => {
  it('Gray/Alpha selection, All, Reset, Apply exactly once, and matching visibility', async () => {
    const p = props(); await act(async () => root.render(<KernelDialog {...p} />)); await flush();
    expect(document.body.textContent).toContain('Mask / Alpha');
    await input('[aria-label="Ядро 2,2"]',2); await flush();
    expect([...last(p.onPreview).data]).toEqual([128,128,128,255]);
    await checkbox('All'); await flush(); expect(worker.run.mock.calls.at(-1)![0].channels).toEqual(['r','g','b','a']);
    await checkbox('Gray'); await flush(); expect(worker.run.mock.calls.at(-1)![0].channels).toEqual(['a']);
    await click('Сброс'); await flush(); expect(p.onClose).not.toHaveBeenCalled();
    await input('[aria-label="Ядро 2,2"]',0.5); await flush(); const preview = last(p.onPreview);
    await click('Применить'); await click('Применить');
    expect(p.onApply).toHaveBeenCalledTimes(1); expect([...last(p.onApply).data]).toEqual([64,64,64,64]);
    expect(preview.data).toEqual(applyChannelFilter(last(p.onApply),active).data);
  });
  it.each(['off','cancel','empty','invalid','apply'] as const)('late preview cannot overwrite %s', async transition => {
    let finish!: (image: ImageData) => void;
    worker.run.mockImplementationOnce(() => new Promise<ImageData>(resolve => { finish = resolve; }));
    const p = props(); await act(async () => root.render(<KernelDialog {...p} />)); await flush();
    if (transition === 'off') await checkbox('Preview');
    if (transition === 'cancel') await click('Отмена');
    if (transition === 'empty') await checkbox('Gray');
    if (transition === 'invalid') await input('[aria-label="Ядро 2,2"]','bad');
    if (transition === 'apply') await click('Применить');
    const count = p.onPreview.mock.calls.length;
    await act(async () => finish(src()));
    expect(p.onPreview).toHaveBeenCalledTimes(count);
    if (transition !== 'apply') expect(last(p.onPreview)).toBe(p.snapshotImageData);
  });
});
