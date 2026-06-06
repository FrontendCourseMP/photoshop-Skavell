import { describe, it, expect } from 'vitest';
import { encodeGb7 } from './encodeGb7';
import { decodeGb7 } from './decodeGb7';
import { GB7_SIGNATURE, GB7_HEADER_SIZE } from './gb7Constants';

function makeImageData(pixels: { r: number; g: number; b: number; a: number }[]): ImageData {
  const imageData = new ImageData(pixels.length, 1);
  for (let i = 0; i < pixels.length; i++) {
    imageData.data[i * 4]     = pixels[i].r;
    imageData.data[i * 4 + 1] = pixels[i].g;
    imageData.data[i * 4 + 2] = pixels[i].b;
    imageData.data[i * 4 + 3] = pixels[i].a;
  }
  return imageData;
}

describe('encodeGb7', () => {
  it('produces correct signature', () => {
    const imageData = makeImageData([{ r: 0, g: 0, b: 0, a: 255 }]);
    const result = encodeGb7(imageData);
    expect(result[0]).toBe(GB7_SIGNATURE[0]);
    expect(result[1]).toBe(GB7_SIGNATURE[1]);
    expect(result[2]).toBe(GB7_SIGNATURE[2]);
    expect(result[3]).toBe(GB7_SIGNATURE[3]);
  });

  it('produces correct header size', () => {
    const imageData = makeImageData([{ r: 0, g: 0, b: 0, a: 255 }, { r: 0, g: 0, b: 0, a: 255 }]);
    const result = encodeGb7(imageData);
    expect(result.length).toBe(GB7_HEADER_SIZE + 2);
  });

  it('sets hasMask=0 when all pixels are opaque', () => {
    const imageData = makeImageData([{ r: 128, g: 128, b: 128, a: 255 }]);
    const result = encodeGb7(imageData);
    expect(result[5]).toBe(0x00);
  });

  it('sets hasMask=1 when any pixel has alpha < 255', () => {
    const imageData = makeImageData([
      { r: 128, g: 128, b: 128, a: 255 },
      { r: 128, g: 128, b: 128, a: 0 },
    ]);
    const result = encodeGb7(imageData);
    expect(result[5]).toBe(0x01);
  });

  it('encodes black pixel as gray7=0', () => {
    const imageData = makeImageData([{ r: 0, g: 0, b: 0, a: 255 }]);
    const result = encodeGb7(imageData);
    expect(result[GB7_HEADER_SIZE] & 0b0111_1111).toBe(0);
  });

  it('encodes white pixel as gray7=127', () => {
    const imageData = makeImageData([{ r: 255, g: 255, b: 255, a: 255 }]);
    const result = encodeGb7(imageData);
    expect(result[GB7_HEADER_SIZE] & 0b0111_1111).toBe(127);
  });

  it('sets mask bit=1 for visible pixels when mask is used', () => {
    const imageData = makeImageData([
      { r: 128, g: 128, b: 128, a: 255 }, // visible
      { r: 128, g: 128, b: 128, a: 0 },   // masked
    ]);
    const result = encodeGb7(imageData);
    expect((result[GB7_HEADER_SIZE]     & 0b1000_0000) !== 0).toBe(true);  // opaque → bit7=1
    expect((result[GB7_HEADER_SIZE + 1] & 0b1000_0000) !== 0).toBe(false); // transparent → bit7=0
  });

  it('round-trips through encode → decode without data loss', () => {
    const pixels = [
      { r: 0,   g: 0,   b: 0,   a: 255 },
      { r: 255, g: 255, b: 255, a: 255 },
      { r: 128, g: 100, b: 50,  a: 255 },
    ];
    const original = makeImageData(pixels);
    const encoded = encodeGb7(original);
    const { imageData: decoded } = decodeGb7(encoded.buffer as ArrayBuffer);

    for (let i = 0; i < pixels.length; i++) {
      // Grayscale round-trip: luminance → gray7 → gray8
      const luma = 0.299 * pixels[i].r + 0.587 * pixels[i].g + 0.114 * pixels[i].b;
      const gray7 = Math.round((luma / 255) * 127);
      const expected = Math.round((gray7 / 127) * 255);
      expect(decoded.data[i * 4]).toBe(expected);
      expect(decoded.data[i * 4 + 3]).toBe(255);
    }
  });

  it('writes correct width and height in big-endian', () => {
    const imageData = new ImageData(300, 200);
    const result = encodeGb7(imageData);
    const view = new DataView(result.buffer);
    expect(view.getUint16(6, false)).toBe(300);
    expect(view.getUint16(8, false)).toBe(200);
  });
});
