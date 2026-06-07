import { describe, it, expect } from 'vitest';
import { buildLUT, applyLUT } from './levelsAdjustment';
import type { ChannelLUTs } from './levelsAdjustment';

describe('buildLUT', () => {
  it('returns Uint8Array of length 256', () => {
    const lut = buildLUT(0, 255, 1.0);
    expect(lut).toBeInstanceOf(Uint8Array);
    expect(lut).toHaveLength(256);
  });

  it('identity: blackPoint=0, whitePoint=255, gamma=1.0 → lut[v] === v', () => {
    const lut = buildLUT(0, 255, 1.0);
    for (let v = 0; v < 256; v++) {
      expect(lut[v]).toBe(v);
    }
  });

  it('brightening: gamma=2.0 → lut[128] ≈ 181', () => {
    const lut = buildLUT(0, 255, 2.0);
    expect(lut[128]).toBe(181);
  });

  it('darkening: gamma=0.5 → lut[128] ≈ 64', () => {
    const lut = buildLUT(0, 255, 0.5);
    expect(lut[128]).toBe(64);
  });

  it('black point 128: values ≤ blackPoint map to 0, whitePoint maps to 255', () => {
    const lut = buildLUT(128, 255, 1.0);
    expect(lut[0]).toBe(0);
    expect(lut[127]).toBe(0);
    expect(lut[128]).toBe(0);
    expect(lut[255]).toBe(255);
  });

  it('white point 128: values ≥ whitePoint map to 255', () => {
    const lut = buildLUT(0, 128, 1.0);
    expect(lut[0]).toBe(0);
    expect(lut[128]).toBe(255);
    expect(lut[255]).toBe(255);
  });

  it('minimum range (blackPoint=127, whitePoint=128)', () => {
    const lut = buildLUT(127, 128, 1.0);
    expect(lut[126]).toBe(0);
    expect(lut[127]).toBe(0);
    expect(lut[128]).toBe(255);
    expect(lut[129]).toBe(255);
  });
});

describe('applyLUT', () => {
  function makeImageData(pixels: [number, number, number, number][]): ImageData {
    const data = new Uint8ClampedArray(pixels.length * 4);
    for (let i = 0; i < pixels.length; i++) {
      data[i * 4]     = pixels[i][0];
      data[i * 4 + 1] = pixels[i][1];
      data[i * 4 + 2] = pixels[i][2];
      data[i * 4 + 3] = pixels[i][3];
    }
    return new ImageData(data, pixels.length, 1);
  }

  function identityLUT(): Uint8Array {
    return buildLUT(0, 255, 1.0);
  }

  it('identity LUT → output equals input byte-for-byte', () => {
    const img = makeImageData([[100, 150, 200, 255]]);
    const luts: ChannelLUTs = {
      r: identityLUT(), g: identityLUT(), b: identityLUT(), a: identityLUT(),
    };
    const result = applyLUT(img, luts);
    expect(result.data[0]).toBe(100);
    expect(result.data[1]).toBe(150);
    expect(result.data[2]).toBe(200);
    expect(result.data[3]).toBe(255);
  });

  it('applies different LUTs to each channel independently', () => {
    const img = makeImageData([[128, 128, 128, 128]]);
    const luts: ChannelLUTs = {
      r: buildLUT(128, 255, 1.0), // 128 → 0 (clamped to blackPoint)
      g: identityLUT(),
      b: identityLUT(),
      a: identityLUT(),
    };
    const result = applyLUT(img, luts);
    expect(result.data[0]).toBe(0);    // r: clamped to blackPoint → 0
    expect(result.data[1]).toBe(128);  // g: identity
    expect(result.data[2]).toBe(128);  // b: identity
    expect(result.data[3]).toBe(128);  // a: identity
  });

  it('returns a new ImageData with the same dimensions', () => {
    const img = makeImageData([[0, 0, 0, 255], [255, 255, 255, 255]]);
    const luts: ChannelLUTs = {
      r: identityLUT(), g: identityLUT(), b: identityLUT(), a: identityLUT(),
    };
    const result = applyLUT(img, luts);
    expect(result.width).toBe(2);
    expect(result.height).toBe(1);
  });

  it('does not mutate source ImageData', () => {
    const img = makeImageData([[100, 150, 200, 255]]);
    const original = Array.from(img.data);
    const luts: ChannelLUTs = {
      r: buildLUT(0, 128, 1.0), g: identityLUT(), b: identityLUT(), a: identityLUT(),
    };
    applyLUT(img, luts);
    expect(Array.from(img.data)).toEqual(original);
  });
});
