import { describe, it, expect } from 'vitest';
import { buildChannelThumbnail } from './channelThumbnail';

function makeSolid(w: number, h: number, r: number, g: number, b: number, a: number): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  }
  return new ImageData(data, w, h);
}

describe('buildChannelThumbnail', () => {
  it('result dimensions ≤ 64 for large image', () => {
    const src = makeSolid(200, 100, 255, 0, 0, 255);
    const thumb = buildChannelThumbnail(src, 'r');
    expect(thumb.width).toBeLessThanOrEqual(64);
    expect(thumb.height).toBeLessThanOrEqual(64);
  });

  it('small image is not upscaled beyond its original size', () => {
    const src = makeSolid(4, 4, 255, 0, 0, 255);
    const thumb = buildChannelThumbnail(src, 'r');
    expect(thumb.width).toBe(4);
    expect(thumb.height).toBe(4);
  });

  it('R channel: pixel (255,0,0) → gray=255 in thumbnail', () => {
    const src = makeSolid(8, 8, 255, 0, 0, 255);
    const thumb = buildChannelThumbnail(src, 'r');
    expect(thumb.data[0]).toBe(255);
    expect(thumb.data[1]).toBe(255);
    expect(thumb.data[2]).toBe(255);
    expect(thumb.data[3]).toBe(255);
  });

  it('G channel: pixel (0,200,0) → gray=200 in thumbnail', () => {
    const src = makeSolid(8, 8, 0, 200, 0, 255);
    const thumb = buildChannelThumbnail(src, 'g');
    expect(thumb.data[0]).toBe(200);
  });

  it('A channel: alpha value becomes gray, thumbnail alpha=255', () => {
    const src = makeSolid(8, 8, 0, 0, 0, 128);
    const thumb = buildChannelThumbnail(src, 'a');
    expect(thumb.data[0]).toBe(128);
    expect(thumb.data[3]).toBe(255);
  });

  it('gray channel: uses luminance formula 0.299R+0.587G+0.114B', () => {
    // Pure red: luminance = 0.299 * 255 ≈ 76
    const src = makeSolid(8, 8, 255, 0, 0, 255);
    const thumb = buildChannelThumbnail(src, 'gray');
    expect(thumb.data[0]).toBeCloseTo(76, 0);
  });
});
