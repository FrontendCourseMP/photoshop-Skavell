import type { LoadedImage, ImageFormat } from './imageTypes';
import { getFormatFromFile } from '../shared/utils/fileFormat';
import { decodeGb7 } from '../formats/gb7/decodeGb7';

/**
 * Reads PNG IHDR chunk (always at a fixed offset) to determine
 * the real bit depth and color type stored in the file.
 *
 * PNG layout:
 *   bytes  0– 7: signature
 *   bytes  8–11: IHDR chunk length
 *   bytes 12–15: chunk type "IHDR"
 *   bytes 16–19: width
 *   bytes 20–23: height
 *   byte    24 : bit depth (bits per sample)
 *   byte    25 : color type
 */
function parsePngColorDepth(bytes: Uint8Array): string {
  if (bytes.length < 26) return 'unknown';

  const bitDepth = bytes[24];
  const colorType = bytes[25];

  const channelsPerType: Record<number, number> = {
    0: 1,  // grayscale
    2: 3,  // RGB
    3: 1,  // indexed (palette)
    4: 2,  // grayscale + alpha
    6: 4,  // RGBA
  };
  const labelPerType: Record<number, string> = {
    0: 'grayscale',
    2: 'RGB',
    3: 'indexed',
    4: 'grayscale+alpha',
    6: 'RGBA',
  };

  const channels = channelsPerType[colorType] ?? 1;
  const label = labelPerType[colorType] ?? 'unknown';
  return `${bitDepth * channels}-bit ${label}`;
}

/**
 * Scans JPEG byte stream for an SOF (Start Of Frame) marker to read
 * precision (bits per sample) and number of components (channels).
 *
 * SOF data layout (after the 2-byte marker):
 *   2 bytes : segment length
 *   1 byte  : precision (bits per sample per channel, almost always 8)
 *   2 bytes : frame height
 *   2 bytes : frame width
 *   1 byte  : Nf — number of image components (1=gray, 3=RGB/YCbCr, 4=CMYK)
 */
function parseJpgColorDepth(bytes: Uint8Array): string {
  let i = 2; // skip SOI marker (0xFF 0xD8)

  while (i + 3 < bytes.length) {
    if (bytes[i] !== 0xFF) break;
    const marker = bytes[i + 1];
    i += 2;

    // Markers that carry no length field: SOI, EOI, RSTn
    if (marker === 0xD8 || marker === 0xD9 || (marker >= 0xD0 && marker <= 0xD7)) continue;
    if (i + 1 >= bytes.length) break;

    const segLen = (bytes[i] << 8) | bytes[i + 1];

    // SOF markers: C0–C3, C5–C7, C9–CB, CD–CF
    // (excludes C4=DHT, C8=JPEGext, CC=DAC which share the 0xCx range but aren't SOF)
    const isSOF = (marker >= 0xC0 && marker <= 0xC3) ||
                  (marker >= 0xC5 && marker <= 0xC7) ||
                  (marker >= 0xC9 && marker <= 0xCB) ||
                  (marker >= 0xCD && marker <= 0xCF);

    if (isSOF && segLen >= 8 && i + 7 < bytes.length) {
      const precision  = bytes[i + 2]; // bits per sample per channel
      const components = bytes[i + 7]; // number of channels
      const bpp = precision * components;
      if (components === 1) return `${bpp}-bit grayscale`;
      if (components === 3) return `${bpp}-bit RGB`;
      if (components === 4) return `${bpp}-bit CMYK`;
      return `${bpp}-bit (${components}ch)`;
    }

    if (marker === 0xDA) break; // SOS — compressed data follows, safe to stop
    i += segLen;
  }

  return '24-bit RGB'; // safe fallback
}

/** Returns true if at least one pixel has alpha < 255. */
function hasAlphaPixels(data: Uint8ClampedArray): boolean {
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 255) return true;
  }
  return false;
}

function loadImageDataFromUrl(
  url: string,
  fileName: string,
): Promise<{ imageData: ImageData; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx === null) {
        reject(new Error('Не удалось создать offscreen canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve({
        imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
        width: canvas.width,
        height: canvas.height,
      });
    };
    img.onerror = () => reject(new Error(`Не удалось загрузить изображение: ${fileName}`));
    img.src = url;
  });
}

async function loadRasterImage(file: File): Promise<LoadedImage> {
  const fmt = getFormatFromFile(file) ?? 'png';
  const format: ImageFormat = fmt === 'gb7' ? 'png' : fmt;

  const url = URL.createObjectURL(file);
  try {
    // Load pixel data and raw bytes in parallel
    const [imgResult, buffer] = await Promise.all([
      loadImageDataFromUrl(url, file.name),
      file.arrayBuffer(),
    ]);

    const bytes = new Uint8Array(buffer);
    const colorDepth = (format === 'jpg' || format === 'jpeg')
      ? parseJpgColorDepth(bytes)
      : parsePngColorDepth(bytes);

    const hasAlpha = (format !== 'jpg' && format !== 'jpeg')
      ? hasAlphaPixels(imgResult.imageData.data)
      : false;

    return {
      name: file.name,
      format,
      width: imgResult.width,
      height: imgResult.height,
      colorDepth,
      imageData: imgResult.imageData,
      hasAlpha,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function loadImageFile(file: File): Promise<LoadedImage> {
  const format = getFormatFromFile(file);
  if (format === null) {
    throw new Error(`Неподдерживаемый формат файла: ${file.name}`);
  }

  if (format === 'gb7') {
    const buffer = await file.arrayBuffer();
    const { header, imageData } = decodeGb7(buffer);
    return {
      name: file.name,
      format: 'gb7',
      width: header.width,
      height: header.height,
      colorDepth: header.hasMask ? '8-bit grayscale' : '7-bit grayscale',
      imageData,
      hasMask: header.hasMask,
    };
  }

  return loadRasterImage(file);
}
