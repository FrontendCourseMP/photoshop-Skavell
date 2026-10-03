import type { ChannelKey } from './imageTypes';

/** Source structure is retained even when all alpha samples are opaque. */
export type ChannelModel = {
  color: 'gray' | 'rgb';
  alpha: 'none' | 'alpha' | 'mask';
  grayMax: 127 | 255;
};
export type ChannelDef = { key: ChannelKey; label: string; max: number };

export function getChannels(model: ChannelModel): ChannelDef[] {
  const colors: ChannelDef[] = model.color === 'gray'
    ? [{ key: 'gray', label: 'Gray', max: model.grayMax }]
    : [{ key: 'r', label: 'R', max: 255 }, { key: 'g', label: 'G', max: 255 }, { key: 'b', label: 'B', max: 255 }];
  if (model.alpha !== 'none') colors.push({ key: 'a', label: model.alpha === 'mask' ? 'Mask / Alpha' : 'Alpha', max: 255 });
  return colors;
}

export function expandChannels(keys: ChannelKey[]): ('r' | 'g' | 'b' | 'a')[] {
  return [...new Set(keys.flatMap(key => key === 'gray' ? ['r', 'g', 'b'] as const : [key]))];
}

export function gb7Model(hasMask: boolean): ChannelModel {
  return { color: 'gray', alpha: hasMask ? 'mask' : 'none', grayMax: 127 };
}

export function parsePngMetadata(bytes: Uint8Array): { channelModel: ChannelModel; colorDepth: string } {
  if (bytes.length < 33 || ![137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v)) throw new Error('Некорректный заголовок PNG');
  const depth = bytes[24], type = bytes[25];
  const names: Record<number, [number, string]> = { 0: [1, 'grayscale'], 2: [3, 'RGB'], 3: [1, 'indexed'], 4: [2, 'grayscale+alpha'], 6: [4, 'RGBA'] };
  if (!names[type]) throw new Error('Неизвестная модель PNG');
  let transparency = false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let pos = 8; pos + 12 <= bytes.length;) {
    const length = view.getUint32(pos);
    if (length > bytes.length - pos - 12) throw new Error('Обрезанный PNG');
    const chunk = String.fromCharCode(...bytes.subarray(pos + 4, pos + 8));
    if (chunk === 'tRNS') transparency = true;
    if (chunk === 'IDAT' || chunk === 'IEND') break;
    pos += length + 12;
  }
  return {
    channelModel: { color: type === 0 || type === 4 ? 'gray' : 'rgb', alpha: type === 4 || type === 6 || transparency ? 'alpha' : 'none', grayMax: 255 },
    colorDepth: `${depth * names[type][0]}-bit ${names[type][1]}${transparency ? ' + tRNS' : ''} → 8-bit/channel`,
  };
}

export function parseJpegMetadata(bytes: Uint8Array): { channelModel: ChannelModel; colorDepth: string } {
  for (let pos = 2; pos + 3 < bytes.length;) {
    if (bytes[pos++] !== 255) break;
    while (bytes[pos] === 255) pos++;
    const marker = bytes[pos++];
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0xd8 || marker === 1 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = bytes[pos] * 256 + bytes[pos + 1];
    if (length < 2 || pos + length > bytes.length) break;
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker) && length >= 8) {
      const depth = bytes[pos + 2], components = bytes[pos + 7];
      return { channelModel: { color: components === 1 ? 'gray' : 'rgb', alpha: 'none', grayMax: 255 }, colorDepth: `${depth * components}-bit ${components === 1 ? 'grayscale' : components === 4 ? 'CMYK → RGB' : 'RGB/YCbCr'} → 8-bit/channel` };
    }
    pos += length;
  }
  throw new Error('Не удалось определить каналы JPEG');
}
