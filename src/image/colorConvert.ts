/** sRGB gamma decode (linearize). */
function linearize(c: number): number {
  const s = c / 255;
  return s > 0.04045 ? Math.pow((s + 0.055) / 1.055, 2.4) : s / 12.92;
}

/** CIE 1976 piecewise cube-root transfer function for XYZ → Lab. */
function cieF(t: number): number {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Convert sRGB (0–255 each) to CIELAB.
 * Uses D65 illuminant (Xn=0.95047, Yn=1.00000, Zn=1.08883).
 * sRGB to XYZ matrix: IEC 61966-2-1.
 */
export function rgbToLab(
  r: number,
  g: number,
  b: number,
): { L: number; a: number; b: number } {
  const lr = linearize(r);
  const lg = linearize(g);
  const lb = linearize(b);

  // sRGB to XYZ (D65) matrix — IEC 61966-2-1
  const X = lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375;
  const Y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750;
  const Z = lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041;

  const fx = cieF(X / 0.95047);
  const fy = cieF(Y / 1.00000);
  const fz = cieF(Z / 1.08883);

  const bStar = round2(200 * (fy - fz));
  return {
    L: round2(116 * fy - 16),
    a: round2(500 * (fx - fy)),
    b: bStar,
  };
}
