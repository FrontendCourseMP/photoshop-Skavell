import { describe, it, expect } from 'vitest';
import { scaleImageData } from './interpolation';

// Helper: build a 1-row ImageData from pixel array
function row(pixels: [number, number, number, number][]): ImageData {
  const data = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach(([r, g, b, a], i) => {
    data[i * 4]     = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  });
  return new ImageData(data, pixels.length);
}

// Helper: build a 1-column (width=1) ImageData from pixel array (for testing Y-axis interpolation)
function col(pixels: [number, number, number, number][]): ImageData {
  const data = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach(([r, g, b, a], i) => {
    data[i * 4]     = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  });
  return new ImageData(data, 1, pixels.length);
}

// Helper: read pixel at (x, y) from ImageData
function px(img: ImageData, x: number, y: number): [number, number, number, number] {
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i+1], img.data[i+2], img.data[i+3]];
}

const RED:   [number,number,number,number] = [255,   0,   0, 255];
const GREEN: [number,number,number,number] = [  0, 255,   0, 255];
const BLUE:  [number,number,number,number] = [  0,   0, 255, 255];
const BLACK: [number,number,number,number] = [  0,   0,   0, 255];
const WHITE: [number,number,number,number] = [255, 255, 255, 255];

describe('scaleImageData – nearest neighbour', () => {
  it('1:1 scale is identity', () => {
    const src = row([RED, GREEN, BLUE]);
    const dst = scaleImageData(src, 3, 1, 'nearest');
    expect(px(dst, 0, 0)).toEqual(RED);
    expect(px(dst, 1, 0)).toEqual(GREEN);
    expect(px(dst, 2, 0)).toEqual(BLUE);
  });

  it('2x upscale repeats each pixel in a 2×2 block', () => {
    const src = row([RED, BLUE]);
    // 2×1 → 4×2
    const dst = scaleImageData(src, 4, 2, 'nearest');
    expect(px(dst, 0, 0)).toEqual(RED);
    expect(px(dst, 1, 0)).toEqual(RED);
    expect(px(dst, 2, 0)).toEqual(BLUE);
    expect(px(dst, 3, 0)).toEqual(BLUE);
    expect(px(dst, 0, 1)).toEqual(RED);
    expect(px(dst, 3, 1)).toEqual(BLUE);
  });

  it('0.5x downscale samples correct pixel', () => {
    const src = row([RED, GREEN, BLUE, WHITE]);
    // 4×1 → 2×1: dst[0] ← src[0], dst[1] ← src[2]
    const dst = scaleImageData(src, 2, 1, 'nearest');
    expect(px(dst, 0, 0)).toEqual(RED);
    expect(px(dst, 1, 0)).toEqual(BLUE);
  });

  it('non-power-of-2: 5×1 → 3×1 maps correct source indices', () => {
    // scaleX = 5/3 ≈ 1.667
    // dst[0]: floor(0 * 1.667) = 0 → src[0]
    // dst[1]: floor(1 * 1.667) = 1 → src[1]
    // dst[2]: floor(2 * 1.667) = 3 → src[3]
    const A: [number,number,number,number] = [10, 0, 0, 255];
    const B: [number,number,number,number] = [20, 0, 0, 255];
    const C: [number,number,number,number] = [30, 0, 0, 255];
    const D: [number,number,number,number] = [40, 0, 0, 255];
    const E: [number,number,number,number] = [50, 0, 0, 255];
    const src = row([A, B, C, D, E]);
    const dst = scaleImageData(src, 3, 1, 'nearest');
    expect(px(dst, 0, 0)).toEqual(A);
    expect(px(dst, 1, 0)).toEqual(B);
    expect(px(dst, 2, 0)).toEqual(D);
  });

  it('1×1 source → any size returns same RGBA', () => {
    const src = row([RED]);
    const dst = scaleImageData(src, 5, 3, 'nearest');
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 5; x++)
        expect(px(dst, x, y)).toEqual(RED);
  });

  it('does not mutate source', () => {
    const src = row([RED, BLUE]);
    const originalR = src.data[0];
    scaleImageData(src, 4, 1, 'nearest');
    expect(src.data[0]).toBe(originalR);
  });

  it('result has correct dimensions', () => {
    const src = row([RED]);
    const dst = scaleImageData(src, 7, 3, 'nearest');
    expect(dst.width).toBe(7);
    expect(dst.height).toBe(3);
  });
});

describe('scaleImageData – bilinear', () => {
  it('1:1 scale matches source (within rounding)', () => {
    const src = row([RED, GREEN, BLUE]);
    const dst = scaleImageData(src, 3, 1, 'bilinear');
    expect(px(dst, 0, 0)).toEqual(RED);
    expect(px(dst, 1, 0)).toEqual(GREEN);
    expect(px(dst, 2, 0)).toEqual(BLUE);
  });

  it('1×1 source → any size returns same RGBA', () => {
    const src = row([GREEN]);
    const dst = scaleImageData(src, 4, 3, 'bilinear');
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 4; x++)
        expect(px(dst, x, y)).toEqual(GREEN);
  });

  it('gradient 2×1 → 4×1: middle pixels are linearly interpolated', () => {
    // src: [BLACK(0,0,0,255), WHITE(255,255,255,255)]
    // scaleX = 2/4 = 0.5; formula: fx = max(0, min(1, (dx+0.5)*0.5 - 0.5))
    // dx=0: fx=0   → R=0
    // dx=1: fx=0.25 → R≈64
    // dx=2: fx=0.75 → R≈191
    // dx=3: fx=1.0  → R=255
    const src = row([BLACK, WHITE]);
    const dst = scaleImageData(src, 4, 1, 'bilinear');
    expect(px(dst, 0, 0)[0]).toBe(0);
    expect(px(dst, 1, 0)[0]).toBe(64);
    expect(px(dst, 2, 0)[0]).toBe(191);
    expect(px(dst, 3, 0)[0]).toBe(255);
  });

  it('Y-axis gradient 1×2 → 1×4: vertical interpolation works', () => {
    // Test Y-dimension interpolation: col [BLACK; WHITE] → 4 rows
    // scaleY = 2/4 = 0.5; same formula as X above
    // dy=0: fy=0   → R=0
    // dy=1: fy=0.25 → R≈64
    // dy=2: fy=0.75 → R≈191
    // dy=3: fy=1.0  → R=255
    const src = col([BLACK, WHITE]);
    const dst = scaleImageData(src, 1, 4, 'bilinear');
    expect(px(dst, 0, 0)[0]).toBe(0);
    expect(px(dst, 0, 1)[0]).toBe(64);
    expect(px(dst, 0, 2)[0]).toBe(191);
    expect(px(dst, 0, 3)[0]).toBe(255);
  });

  it('does not mutate source', () => {
    const src = row([BLACK, WHITE]);
    const original0 = src.data[0];
    scaleImageData(src, 8, 1, 'bilinear');
    expect(src.data[0]).toBe(original0);
  });
});

describe('scaleImageData – dispatch', () => {
  it("method 'nearest' applies nearest-neighbor interpolation (not bilinear)", () => {
    // Test that dispatching to 'nearest' produces step-like results (no blending)
    const src = row([BLACK, WHITE]);
    const dst = scaleImageData(src, 4, 1, 'nearest');
    // Nearest: src[0.75]=src[1]=WHITE, src[2.25]=src[1]=WHITE, etc.
    // Actually: for 2→4 scale, dst[0]←src[0], dst[1]←src[0], dst[2]←src[1], dst[3]←src[1]
    expect(px(dst, 0, 0)[0]).toBe(0);     // nearest picks BLACK
    expect(px(dst, 1, 0)[0]).toBe(0);     // nearest picks BLACK
    expect(px(dst, 2, 0)[0]).toBe(255);   // nearest picks WHITE
    expect(px(dst, 3, 0)[0]).toBe(255);   // nearest picks WHITE
  });

  it("method 'bilinear' applies bilinear interpolation (not nearest)", () => {
    // Test that dispatching to 'bilinear' produces interpolated results (not step-like)
    const src = row([BLACK, WHITE]);
    const dst = scaleImageData(src, 4, 1, 'bilinear');
    // Bilinear blends between neighbors: expected [0, 64, 191, 255]
    expect(px(dst, 0, 0)[0]).toBe(0);     // bilinear: exact BLACK
    expect(px(dst, 1, 0)[0]).toBe(64);    // bilinear: ~1/4 of the way
    expect(px(dst, 2, 0)[0]).toBe(191);   // bilinear: ~3/4 of the way
    expect(px(dst, 3, 0)[0]).toBe(255);   // bilinear: exact WHITE
  });
});
