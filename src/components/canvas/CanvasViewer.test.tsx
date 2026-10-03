import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { CanvasViewer } from './CanvasViewer';

vi.mock('../../image/canvasUtils', () => ({ renderToCanvas: (canvas: HTMLCanvasElement, data: ImageData) => { canvas.width = data.width; canvas.height = data.height; } }));

it('eyedropper maps CSS edges to confirmed pixels at zoom and after scroll without border offsets', async () => {
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  vi.stubGlobal('ResizeObserver',class { observe() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame',(fn: FrameRequestCallback) => { fn(0); return 1; });
  vi.stubGlobal('cancelAnimationFrame',vi.fn());
  const host = document.createElement('div'), root = createRoot(host), pick = vi.fn();
  const original = new ImageData(new Uint8ClampedArray([10,20,30,0,40,50,60,255,70,80,90,255,100,110,120,128]),2,2);
  try {
    await act(async () => root.render(<CanvasViewer imageData={new ImageData(2,2)} originalImageData={original} zoom={300} activeTool="eyedropper" interpolationMethod="bilinear" onPixelPick={pick} onEffectiveZoom={vi.fn()} />));
    const canvas = host.querySelector('canvas')!;
    // Fractional CSS dimensions and a negative origin model zoom + scroll.
    vi.spyOn(canvas,'getBoundingClientRect').mockReturnValue({x:-10.5,y:-20.25,left:-10.5,top:-20.25,width:5.5,height:5.5,right:-5,bottom:-14.75,toJSON:()=>({})});
    await act(async () => canvas.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:-10.4,clientY:-20.1})));
    expect(pick.mock.calls.at(-1)![0]).toMatchObject({x:0,y:0,r:10,g:20,b:30,a:0});
    await act(async () => canvas.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:-5.1,clientY:-14.8})));
    expect(pick.mock.calls.at(-1)![0]).toMatchObject({x:1,y:1,r:100,g:110,b:120,a:128});
    expect(canvas.width).toBe(6); expect(canvas.style.border).toBe(''); expect(canvas.style.outline).not.toBe('');
  } finally {
    await act(async () => root.unmount()); vi.unstubAllGlobals();
  }
});
