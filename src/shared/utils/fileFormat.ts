import type { ImageFormat } from '../../image/imageTypes';

const EXTENSION_MAP: Readonly<Record<string, ImageFormat>> = {
  png: 'png',
  jpg: 'jpg',
  jpeg: 'jpeg',
  gb7: 'gb7',
};

// Allowed MIME types for raster formats; GB7 has no standard MIME type
const MIME_FORMATS: Readonly<Record<string, ImageFormat>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

export function getFormatFromFile(file: File): ImageFormat | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const byExt = EXTENSION_MAP[ext] ?? null;

  // GB7 has no registered MIME type — trust extension + signature validation downstream
  if (byExt === 'gb7') return 'gb7';

  // For raster formats: require both extension and MIME to agree
  const byMime = MIME_FORMATS[file.type] ?? null;
  if (byExt !== null && byMime !== null) return byExt;

  // Fallback: extension alone if MIME is empty string (some browsers omit it for local files)
  if (byExt !== null && file.type === '') return byExt;

  return null;
}

export function replaceExtension(filename: string, newExt: string): string {
  const lastDot = filename.lastIndexOf('.');
  const base = lastDot >= 0 ? filename.slice(0, lastDot) : filename;
  return `${base}.${newExt}`;
}
