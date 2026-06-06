// src/image/loadImageFile.ts
import type { LoadedImage } from './imageTypes';
import { getFormatFromFile } from '../shared/utils/fileFormat';
import { decodeGb7 } from '../formats/gb7/decodeGb7';

function loadRasterImage(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx === null) {
        reject(new Error('Не удалось создать offscreen canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const fmt = getFormatFromFile(file) ?? 'png';
      const format = fmt === 'gb7' ? 'png' : fmt;
      resolve({
        name: file.name,
        format,
        width: canvas.width,
        height: canvas.height,
        colorDepth: '32-bit RGBA',
        imageData,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Не удалось загрузить изображение: ${file.name}`));
    };

    img.src = url;
  });
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
      colorDepth: '7-bit grayscale',
      imageData,
      hasMask: header.hasMask,
    };
  }

  return loadRasterImage(file);
}
