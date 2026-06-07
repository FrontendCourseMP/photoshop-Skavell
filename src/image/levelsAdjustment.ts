export type ChannelLUTs = {
  r: Uint8Array;
  g: Uint8Array;
  b: Uint8Array;
  a: Uint8Array;
};

export function buildLUT(
  blackPoint: number,
  whitePoint: number,
  gamma: number,
): Uint8Array {
  const lut = new Uint8Array(256);
  const range = whitePoint - blackPoint;
  for (let v = 0; v < 256; v++) {
    const clamped = Math.max(blackPoint, Math.min(whitePoint, v));
    const normalized = (clamped - blackPoint) / range;
    const corrected = Math.pow(normalized, 1 / gamma);
    lut[v] = Math.round(corrected * 255);
  }
  return lut;
}

export function applyLUT(src: ImageData, luts: ChannelLUTs): ImageData {
  const result = new ImageData(src.width, src.height);
  const srcData = src.data;
  const dstData = result.data;
  for (let i = 0; i < srcData.length; i += 4) {
    dstData[i]     = luts.r[srcData[i]];
    dstData[i + 1] = luts.g[srcData[i + 1]];
    dstData[i + 2] = luts.b[srcData[i + 2]];
    dstData[i + 3] = luts.a[srcData[i + 3]];
  }
  return result;
}
