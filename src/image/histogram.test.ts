import { describe, it, expect } from 'vitest';
import { computeHistogram } from './histogram';
import type { HistChannel } from './histogram';

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

describe('computeHistogram', () => {
  it('returns array of length 256', () => {
    const img = makeImageData([[0, 0, 0, 255]]);
    expect(computeHistogram(img, 'master')).toHaveLength(256);
  });

  it('master: counts luminance bin correctly for red pixel', () => {
    // [255, 0, 0] → luminance = round(0.299*255 + 0.587*0 + 0.114*0) = round(76.245) = 76
    const img = makeImageData([[255, 0, 0, 255]]);
    const hist = computeHistogram(img, 'master');
    expect(hist[76]).toBe(1);
    expect(hist.reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('r: counts red channel', () => {
    const img = makeImageData([[128, 0, 0, 255]]);
    const hist = computeHistogram(img, 'r');
    expect(hist[128]).toBe(1);
    expect(hist[0]).toBe(0);
  });

  it('g: counts green channel', () => {
    const img = makeImageData([[0, 200, 0, 255]]);
    const hist = computeHistogram(img, 'g');
    expect(hist[200]).toBe(1);
  });

  it('b: counts blue channel', () => {
    const img = makeImageData([[0, 0, 64, 255]]);
    const hist = computeHistogram(img, 'b');
    expect(hist[64]).toBe(1);
  });

  it('a: counts alpha channel', () => {
    const img = makeImageData([[0, 0, 0, 200]]);
    const hist = computeHistogram(img, 'a');
    expect(hist[200]).toBe(1);
  });

  it('total count equals pixel count for multi-pixel image', () => {
    const img = makeImageData([[100, 150, 200, 255], [50, 75, 100, 128]]);
    const hist = computeHistogram(img, 'g');
    expect(hist.reduce((a, b) => a + b, 0)).toBe(2);
  });

  it('all zeros image has entire count in bin 0 for master', () => {
    const img = makeImageData([[0, 0, 0, 255], [0, 0, 0, 255]]);
    const hist = computeHistogram(img, 'master');
    expect(hist[0]).toBe(2);
  });
});

// suppress unused import warning — HistChannel is used as a type-only import
const _: HistChannel = 'master';
void _;
