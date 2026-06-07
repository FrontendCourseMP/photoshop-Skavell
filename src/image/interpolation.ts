export type InterpolationMethod = 'nearest' | 'bilinear';

export function scaleImageData(
  src: ImageData,
  dstWidth: number,
  dstHeight: number,
  method: InterpolationMethod,
): ImageData {
  if (method === 'nearest') return scaleNearest(src, dstWidth, dstHeight);
  return scaleBilinear(src, dstWidth, dstHeight);
}

function scaleNearest(src: ImageData, dstWidth: number, dstHeight: number): ImageData {
  const dst = new ImageData(dstWidth, dstHeight);
  const scaleX = src.width / dstWidth;
  const scaleY = src.height / dstHeight;
  for (let dy = 0; dy < dstHeight; dy++) {
    const sy = Math.min(Math.floor(dy * scaleY), src.height - 1);
    for (let dx = 0; dx < dstWidth; dx++) {
      const sx = Math.min(Math.floor(dx * scaleX), src.width - 1);
      const si = (sy * src.width + sx) * 4;
      const di = (dy * dstWidth + dx) * 4;
      dst.data[di]     = src.data[si];
      dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2];
      dst.data[di + 3] = src.data[si + 3];
    }
  }
  return dst;
}

function scaleBilinear(src: ImageData, dstWidth: number, dstHeight: number): ImageData {
  const dst = new ImageData(dstWidth, dstHeight);
  const scaleX = src.width / dstWidth;
  const scaleY = src.height / dstHeight;
  for (let dy = 0; dy < dstHeight; dy++) {
    const fy = Math.max(0, Math.min(src.height - 1, (dy + 0.5) * scaleY - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(src.height - 1, y0 + 1);
    const yt = fy - y0;
    for (let dx = 0; dx < dstWidth; dx++) {
      const fx = Math.max(0, Math.min(src.width - 1, (dx + 0.5) * scaleX - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(src.width - 1, x0 + 1);
      const xt = fx - x0;
      const di = (dy * dstWidth + dx) * 4;
      for (let c = 0; c < 4; c++) {
        const tl = src.data[(y0 * src.width + x0) * 4 + c];
        const tr = src.data[(y0 * src.width + x1) * 4 + c];
        const bl = src.data[(y1 * src.width + x0) * 4 + c];
        const br = src.data[(y1 * src.width + x1) * 4 + c];
        dst.data[di + c] = Math.round(
          tl * (1 - xt) * (1 - yt) +
          tr * xt       * (1 - yt) +
          bl * (1 - xt) * yt       +
          br * xt       * yt,
        );
      }
    }
  }
  return dst;
}
