import type { ActiveChannels } from '../app/store/imageTypes';

/**
 * Returns a new ImageData with selected channels applied.
 * When `channels.a` is false, alpha is forced to 255 (fully opaque)
 * rather than 0 — disabling the alpha channel means "view without transparency",
 * not "discard all pixels".
 */
export function applyChannelFilter(
  src: ImageData,
  channels: ActiveChannels,
  hasAlpha = true,
): ImageData {
  const result = new ImageData(src.width, src.height);
  const srcData = src.data;
  const dstData = result.data;

  const alphaOnly = hasAlpha && channels.a && !channels.r && !channels.g && !channels.b;
  for (let i = 0; i < srcData.length; i += 4) {
    if (alphaOnly) {
      dstData[i] = dstData[i + 1] = dstData[i + 2] = srcData[i + 3];
      dstData[i + 3] = 255;
      continue;
    }
    dstData[i]     = channels.r ? srcData[i]     : 0;
    dstData[i + 1] = channels.g ? srcData[i + 1] : 0;
    dstData[i + 2] = channels.b ? srcData[i + 2] : 0;
    dstData[i + 3] = channels.a ? srcData[i + 3] : 255;
  }

  return result;
}
