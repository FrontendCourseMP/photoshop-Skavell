import type { ImageFormat } from '../../image/imageTypes';

/** File extensions and browser MIME types can be wrong; validate the body downstream. */
export function getFormatFromBytes(bytes: Uint8Array): Exclude<ImageFormat, 'jpeg'> | null {
  const startsWith = (signature: number[]) => signature.every((value, index) => bytes[index] === value);
  if (startsWith([137, 80, 78, 71, 13, 10, 26, 10])) return 'png';
  if (startsWith([0xff, 0xd8, 0xff])) return 'jpg';
  if (startsWith([0x47, 0x42, 0x37, 0x1d])) return 'gb7';
  return null;
}

export function replaceExtension(filename: string, newExt: string): string {
  const lastDot = filename.lastIndexOf('.');
  const base = lastDot >= 0 ? filename.slice(0, lastDot) : filename;
  return `${base}.${newExt}`;
}
