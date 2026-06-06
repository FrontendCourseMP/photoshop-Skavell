import { describe, it, expect } from 'vitest';
import { applyChannelFilter } from './channelFilter';

function makeImageData(pixels: [number, number, number, number][]): ImageData {
  const data = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach(([r, g, b, a], i) => {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  });
  return new ImageData(data, pixels.length, 1);
}

describe('applyChannelFilter', () => {
  it('all channels enabled: data is unchanged', () => {
    const src = makeImageData([[200, 100, 50, 255]]);
    const result = applyChannelFilter(src, { r: true, g: true, b: true, a: true });
    expect(result.data[0]).toBe(200);
    expect(result.data[1]).toBe(100);
    expect(result.data[2]).toBe(50);
    expect(result.data[3]).toBe(255);
  });

  it('R disabled: red channel zeroed, others unchanged', () => {
    const src = makeImageData([[200, 100, 50, 255]]);
    const result = applyChannelFilter(src, { r: false, g: true, b: true, a: true });
    expect(result.data[0]).toBe(0);
    expect(result.data[1]).toBe(100);
    expect(result.data[2]).toBe(50);
    expect(result.data[3]).toBe(255);
  });

  it('G and B disabled: only red channel remains', () => {
    const src = makeImageData([[200, 100, 50, 255]]);
    const result = applyChannelFilter(src, { r: true, g: false, b: false, a: true });
    expect(result.data[0]).toBe(200);
    expect(result.data[1]).toBe(0);
    expect(result.data[2]).toBe(0);
  });

  it('A disabled: alpha forced to 255, not zeroed', () => {
    const src = makeImageData([[100, 100, 100, 128]]);
    const result = applyChannelFilter(src, { r: true, g: true, b: true, a: false });
    expect(result.data[3]).toBe(255);
  });

  it('does not mutate source ImageData', () => {
    const src = makeImageData([[100, 150, 200, 255]]);
    const original = Array.from(src.data);
    applyChannelFilter(src, { r: false, g: false, b: false, a: false });
    expect(Array.from(src.data)).toEqual(original);
  });

  it('result has same dimensions as source', () => {
    const src = new ImageData(10, 20);
    const result = applyChannelFilter(src, { r: true, g: true, b: true, a: true });
    expect(result.width).toBe(10);
    expect(result.height).toBe(20);
  });
});
