import type { ChannelKey } from './imageTypes';
import type { ChannelModel } from './channelModel';

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
  max = 255,
): Uint8Array {
  if (![blackPoint, whitePoint, gamma, max].every(Number.isFinite) || blackPoint < 0 || whitePoint > max || blackPoint >= whitePoint || gamma <= 0) throw new Error('Некорректные уровни');
  const lut = new Uint8Array(256);
  const range = whitePoint - blackPoint;
  for (let v = 0; v < 256; v++) {
    const clamped = Math.max(blackPoint, Math.min(whitePoint, v * max / 255));
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

export type LevelsChannel = 'master' | ChannelKey;
export type ChannelSettings = { blackPoint: number; whitePoint: number; gamma: number };
export type LevelsSettings = Record<LevelsChannel, ChannelSettings>;
export function makeDefaultSettings(model: ChannelModel): LevelsSettings {
  const neutral = (max: number): ChannelSettings => ({ blackPoint: 0, whitePoint: max, gamma: 1 });
  return { master: neutral(model.color === 'gray' ? model.grayMax : 255), gray: neutral(model.grayMax), r: neutral(255), g: neutral(255), b: neutral(255), a: neutral(255) };
}
export function updateLevels(settings: LevelsSettings, channel: LevelsChannel, partial: Partial<ChannelSettings>): LevelsSettings {
  return { ...settings, [channel]: { ...settings[channel], ...partial } };
}
/** Per-channel first, then Master. Master never processes alpha. Gray shares one LUT. */
export function applyLevels(src: ImageData, model: ChannelModel, settings: LevelsSettings): ImageData {
  const lut = (key: LevelsChannel, max: number) => {
    const s = settings[key];
    return buildLUT(s.blackPoint, s.whitePoint, s.gamma, max);
  };
  const max = model.color === 'gray' ? model.grayMax : 255;
  const master = lut('master', max);
  const composed = (key: LevelsChannel) => lut(key, max).map(v => master[v]);
  const gray = model.color === 'gray' ? composed('gray') : null;
  return applyLUT(src, { r: gray ?? composed('r'), g: gray ?? composed('g'), b: gray ?? composed('b'), a: model.alpha === 'none' ? buildLUT(0, 255, 1) : lut('a', 255) });
}
export function calcGammaPos(black: number, white: number, gamma: number): number {
  return black + (white - black) * Math.pow(0.5, gamma);
}
export function calcGammaFromPos(black: number, white: number, pos: number): number {
  const t = Math.max(0.001, Math.min(0.999, (pos - black) / (white - black)));
  return Math.max(0.1, Math.min(9.99, Math.log(t) / Math.log(0.5)));
}
