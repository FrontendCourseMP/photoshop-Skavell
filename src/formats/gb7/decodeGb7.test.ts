import { describe, it, expect } from 'vitest';
import { decodeGb7 } from './decodeGb7';

function makeGb7(pixels: number[], hasMask = false): ArrayBuffer {
  const width = pixels.length;
  const height = 1;
  const buf = new ArrayBuffer(12 + width * height);
  const bytes = new Uint8Array(buf);
  const view = new DataView(buf);
  bytes[0] = 0x47; bytes[1] = 0x42; bytes[2] = 0x37; bytes[3] = 0x1d;
  bytes[4] = 0x01;
  bytes[5] = hasMask ? 0x01 : 0x00;
  view.setUint16(6, width, false);
  view.setUint16(8, height, false);
  for (let i = 0; i < pixels.length; i++) {
    bytes[12 + i] = pixels[i];
  }
  return buf;
}

describe('decodeGb7', () => {
  it('throws on invalid file', () => {
    expect(() => decodeGb7(new ArrayBuffer(4))).toThrow();
  });

  it('decodes black pixel (gray7=0) correctly', () => {
    const buf = makeGb7([0x00]); // gray7=0, mask=0
    const { imageData } = decodeGb7(buf);
    expect(imageData.data[0]).toBe(0);   // R
    expect(imageData.data[1]).toBe(0);   // G
    expect(imageData.data[2]).toBe(0);   // B
    expect(imageData.data[3]).toBe(255); // A (no mask → opaque)
  });

  it('decodes white pixel (gray7=127) correctly', () => {
    const buf = makeGb7([0x7f]); // gray7=127
    const { imageData } = decodeGb7(buf);
    expect(imageData.data[0]).toBe(255);
    expect(imageData.data[3]).toBe(255);
  });

  it('decodes mid-grey pixel', () => {
    // gray7=64 → gray8 = round(64/127*255)
    const buf = makeGb7([64]);
    const { imageData } = decodeGb7(buf);
    const gray8 = Math.round((64 / 127) * 255);
    expect(imageData.data[0]).toBe(gray8);
  });

  it('sets alpha=255 for all pixels when no mask flag', () => {
    // pixel byte=0x80 has mask bit set but hasMask=false in header
    const buf = makeGb7([0x80], false);
    const { imageData } = decodeGb7(buf);
    expect(imageData.data[3]).toBe(255);
  });

  it('sets alpha=0 for masked-out pixels when mask flag present', () => {
    // mask bit=0 means pixel IS masked (transparent)
    const buf = makeGb7([0x40], true); // bit7=0 → masked out → alpha=0
    const { imageData } = decodeGb7(buf);
    expect(imageData.data[3]).toBe(0);
  });

  it('sets alpha=255 for visible pixels when mask flag present', () => {
    // mask bit=1 means pixel is NOT masked (opaque)
    const buf = makeGb7([0x80 | 0x40], true); // bit7=1 → not masked → alpha=255
    const { imageData } = decodeGb7(buf);
    expect(imageData.data[3]).toBe(255);
  });

  it('returns correct header info', () => {
    const buf = makeGb7([0x00, 0x7f], true);
    const { header } = decodeGb7(buf);
    expect(header.width).toBe(2);
    expect(header.height).toBe(1);
    expect(header.hasMask).toBe(true);
    expect(header.version).toBe(0x01);
  });

  it('creates ImageData with correct dimensions', () => {
    const buf = makeGb7([0, 0, 0, 0]); // 4 wide × 1 tall
    const { imageData } = decodeGb7(buf);
    expect(imageData.width).toBe(4);
    expect(imageData.height).toBe(1);
  });
});
