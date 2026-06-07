export type EdgeStrategy = 'black' | 'white' | 'clamp';
export type KernelChannel = 'r' | 'g' | 'b' | 'a';

const CHANNEL_OFFSET: Record<KernelChannel, number> = { r: 0, g: 1, b: 2, a: 3 };

// Out-of-bounds fill value per channel for black/white strategies.
// black: RGB=0, A=255 (fully opaque black — not transparent black).
function oobValue(ch: KernelChannel, edge: 'black' | 'white'): number {
  if (edge === 'white') return 255;
  return ch === 'a' ? 255 : 0;
}

export function applyKernel(
  src: ImageData,
  kernel: number[][],
  channels: KernelChannel[],
  edge: EdgeStrategy,
  normalize: boolean,
): ImageData {
  const { width, height } = src;
  const dst = new ImageData(new Uint8ClampedArray(src.data), width, height);

  let k = kernel;
  if (normalize) {
    const sum = kernel.flat().reduce((acc, v) => acc + v, 0);
    if (sum > 0) {
      k = kernel.map(row => row.map(v => v / sum));
    }
  }

  for (const ch of channels) {
    const off = CHANNEL_OFFSET[ch];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let acc = 0;
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const ny = y + ky - 1;
            const nx = x + kx - 1;
            let val: number;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
              if (edge === 'clamp') {
                const cx = Math.max(0, Math.min(width - 1, nx));
                const cy = Math.max(0, Math.min(height - 1, ny));
                val = src.data[(cy * width + cx) * 4 + off];
              } else {
                val = oobValue(ch, edge);
              }
            } else {
              val = src.data[(ny * width + nx) * 4 + off];
            }
            acc += k[ky][kx] * val;
          }
        }
        dst.data[(y * width + x) * 4 + off] = Math.max(0, Math.min(255, Math.round(acc)));
      }
    }
  }

  return dst;
}
