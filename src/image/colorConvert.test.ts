import { describe, it, expect } from 'vitest';
import { rgbToLab } from './colorConvert';

describe('rgbToLab', () => {
  it('black (0,0,0) → L*≈0, a*≈0, b*≈0', () => {
    const lab = rgbToLab(0, 0, 0);
    expect(lab.L).toBeCloseTo(0, 1);
    expect(lab.a).toBeCloseTo(0, 1);
    expect(lab.b).toBeCloseTo(0, 1);
  });

  it('white (255,255,255) → L*≈100, a*≈0, b*≈0', () => {
    const lab = rgbToLab(255, 255, 255);
    expect(lab.L).toBeCloseTo(100, 1);
    expect(lab.a).toBeCloseTo(0, 1);
    expect(lab.b).toBeCloseTo(0, 1);
  });

  it('red (255,0,0) → L*≈53.2, a*≈80.1, b*≈67.2', () => {
    const lab = rgbToLab(255, 0, 0);
    expect(lab.L).toBeCloseTo(53.23, 0);
    expect(lab.a).toBeCloseTo(80.11, 0);
    expect(lab.b).toBeCloseTo(67.22, 0);
  });

  it('mid-gray (128,128,128) → L*≈53.4, a*≈0, b*≈0', () => {
    const lab = rgbToLab(128, 128, 128);
    expect(lab.L).toBeCloseTo(53.39, 0);
    expect(lab.a).toBeCloseTo(0, 1);
    expect(lab.b).toBeCloseTo(0, 1);
  });
});
