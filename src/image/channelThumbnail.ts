import type { ChannelKey } from './imageTypes';

const MAX_SIZE = 64;

/**
 * Builds a grayscale thumbnail ImageData for a given channel.
 * Longest side is at most 64px; small images are not upscaled.
 * White = max value, black = 0. Alpha of thumbnail pixels is always 255.
 */
export function buildChannelThumbnail(src: ImageData, channel: ChannelKey): ImageData {
  const scale = Math.min(1, MAX_SIZE / Math.max(src.width, src.height));
  const thumbW = Math.max(1, Math.floor(src.width * scale));
  const thumbH = Math.max(1, Math.floor(src.height * scale));

  const strideX = Math.floor(src.width / thumbW);
  const strideY = Math.floor(src.height / thumbH);

  const result = new ImageData(thumbW, thumbH);
  const srcData = src.data;
  const dstData = result.data;

  for (let ty = 0; ty < thumbH; ty++) {
    const sy = Math.min(ty * strideY, src.height - 1);
    for (let tx = 0; tx < thumbW; tx++) {
      const sx = Math.min(tx * strideX, src.width - 1);
      const srcIdx = (sy * src.width + sx) * 4;
      const dstIdx = (ty * thumbW + tx) * 4;

      let gray = 0;
      switch (channel) {
        case 'r':    gray = srcData[srcIdx];     break;
        case 'g':    gray = srcData[srcIdx + 1]; break;
        case 'b':    gray = srcData[srcIdx + 2]; break;
        case 'a':    gray = srcData[srcIdx + 3]; break;
        case 'gray':
          gray = Math.round(
            0.299 * srcData[srcIdx] +
            0.587 * srcData[srcIdx + 1] +
            0.114 * srcData[srcIdx + 2],
          );
          break;
        default: {
          const _exhaustive: never = channel;
          void _exhaustive;
          gray = 0;
          break;
        }
      }

      dstData[dstIdx]     = gray;
      dstData[dstIdx + 1] = gray;
      dstData[dstIdx + 2] = gray;
      dstData[dstIdx + 3] = 255;
    }
  }

  return result;
}
