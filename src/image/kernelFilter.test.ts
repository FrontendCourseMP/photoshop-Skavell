import { describe, it, expect } from 'vitest';
import { applyKernel } from './kernelFilter';

function makeImg(pixels: [number, number, number, number][], width: number): ImageData {
  const data = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach(([r, g, b, a], i) => {
    data[i * 4] = r; data[i * 4 + 1] = g; data[i * 4 + 2] = b; data[i * 4 + 3] = a;
  });
  return new ImageData(data, width, pixels.length / width);
}

const IDENTITY: number[][] = [[0,0,0],[0,1,0],[0,0,0]];
const ALL_ONES: number[][] = [[1,1,1],[1,1,1],[1,1,1]];
const PREWITT_X: number[][] = [[-1,0,1],[-1,0,1],[-1,0,1]];

describe('applyKernel', () => {
  it('identity kernel, no normalize → pixels unchanged', () => {
    const src = makeImg([[100, 150, 200, 255]], 1);
    const result = applyKernel(src, IDENTITY, ['r', 'g', 'b', 'a'], 'black', false);
    expect(result.data[0]).toBe(100);
    expect(result.data[1]).toBe(150);
    expect(result.data[2]).toBe(200);
    expect(result.data[3]).toBe(255);
  });

  it('box blur normalize=true, clamp edge, uniform image → value preserved', () => {
    const src = makeImg([[90,0,0,255],[90,0,0,255],[90,0,0,255]], 3);
    const result = applyKernel(src, ALL_ONES, ['r'], 'clamp', true);
    expect(result.data[4]).toBe(90); // center pixel (x=1)
  });

  it('box blur normalize=false, clamp edge → R saturates to 255', () => {
    const src = makeImg([[90,0,0,255],[90,0,0,255],[90,0,0,255]], 3);
    const result = applyKernel(src, ALL_ONES, ['r'], 'clamp', false);
    expect(result.data[4]).toBe(255);
  });

  it('edge black on 1×1 → out-of-bounds treated as R=0', () => {
    const src = makeImg([[120, 0, 0, 255]], 1);
    const result = applyKernel(src, ALL_ONES, ['r'], 'black', true);
    expect(result.data[0]).toBe(Math.round(120 / 9)); // 13
  });

  it('edge white on 1×1 → out-of-bounds treated as R=255', () => {
    const src = makeImg([[120, 0, 0, 255]], 1);
    const result = applyKernel(src, ALL_ONES, ['r'], 'white', true);
    expect(result.data[0]).toBe(Math.round((120 + 8 * 255) / 9)); // 240
  });

  it('edge clamp on 1×1 → all neighbors resolve to same pixel', () => {
    const src = makeImg([[120, 0, 0, 255]], 1);
    const result = applyKernel(src, ALL_ONES, ['r'], 'clamp', true);
    expect(result.data[0]).toBe(120);
  });

  it('channel R only → G, B, A remain unchanged', () => {
    const src = makeImg([[100, 150, 200, 255]], 1);
    const result = applyKernel(src, [[0,0,0],[0,2,0],[0,0,0]], ['r'], 'black', false);
    expect(result.data[0]).toBe(200); // R: 2*100 = 200
    expect(result.data[1]).toBe(150); // G unchanged
    expect(result.data[2]).toBe(200); // B unchanged (src B=200)
    expect(result.data[3]).toBe(255); // A unchanged
  });

  it('channel R+G+B → A remains unchanged', () => {
    const src = makeImg([[100, 100, 100, 200]], 1);
    const result = applyKernel(src, [[0,0,0],[0,2,0],[0,0,0]], ['r', 'g', 'b'], 'black', false);
    expect(result.data[3]).toBe(200);
  });

  it('Prewitt X on uniform 3×1 image → center pixel R = 0', () => {
    const src = makeImg([[100,0,0,255],[100,0,0,255],[100,0,0,255]], 3);
    const result = applyKernel(src, PREWITT_X, ['r'], 'black', false);
    expect(result.data[4]).toBe(0); // center pixel (x=1)
  });

  it('does not mutate src.data', () => {
    const src = makeImg([[100, 150, 200, 255]], 1);
    const original = Array.from(src.data);
    applyKernel(src, [[0,-1,0],[-1,5,-1],[0,-1,0]], ['r', 'g', 'b'], 'black', false);
    expect(Array.from(src.data)).toEqual(original);
  });

  it('output dimensions match input', () => {
    const src = makeImg([[100,0,0,255],[200,0,0,255]], 2);
    const result = applyKernel(src, IDENTITY, ['r'], 'black', false);
    expect(result.width).toBe(2);
    expect(result.height).toBe(1);
  });

  it('normalize=true with sum=0 → kernel used as-is (no divide-by-zero)', () => {
    const src = makeImg([[100, 100, 100, 255]], 1);
    const result = applyKernel(src, PREWITT_X, ['r'], 'clamp', true);
    expect(result.data[0]).toBe(0);
  });
});
