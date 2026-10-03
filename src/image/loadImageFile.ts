import type { LoadedImage } from './imageTypes';
import { getFormatFromBytes } from '../shared/utils/fileFormat';
import { decodeGb7 } from '../formats/gb7/decodeGb7';

import { gb7Model, parsePngMetadata, parseJpegMetadata } from './channelModel';

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

async function loadRasterImage(file: File, buffer: ArrayBuffer, format: 'png' | 'jpg'): Promise<LoadedImage> {
  const bytes = new Uint8Array(buffer);
  const metadata = format === 'png' ? parsePngMetadata(bytes) : parseJpegMetadata(bytes);
  // Use the detected MIME too, so a mislabeled File cannot affect browser decoding.
  const url = URL.createObjectURL(new Blob([buffer], { type: format === 'png' ? 'image/png' : 'image/jpeg' }));
  try {
    const imgResult = await loadImageDataFromUrl(url, file.name);

    return {
      name: file.name,
      format,
      width: imgResult.width,
      height: imgResult.height,
      ...metadata,
      imageData: imgResult.imageData,
      hasAlpha: metadata.channelModel.alpha !== 'none',
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function loadImageFile(file: File): Promise<LoadedImage> {
  const buffer = await file.arrayBuffer();
  const format = getFormatFromBytes(new Uint8Array(buffer));
  if (format === null) {
    throw new Error(`Не удалось распознать PNG, JPEG или GB7 по содержимому файла: ${file.name}`);
  }

  if (format === 'gb7') {
    const { header, imageData } = decodeGb7(buffer);
    return {
      name: file.name,
      format: 'gb7',
      width: header.width,
      height: header.height,
      colorDepth: header.hasMask ? '7-bit Gray + 1-bit mask (рабочий Alpha 8-bit)' : '7-bit Gray',
      imageData,
      hasMask: header.hasMask,
      channelModel: gb7Model(header.hasMask),
    };
  }

  return loadRasterImage(file, buffer, format);
}
