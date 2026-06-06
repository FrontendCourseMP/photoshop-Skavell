// src/image/exportImage.ts
import { encodeGb7 } from '../formats/gb7/encodeGb7';

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          reject(new Error(`Не удалось создать Blob для ${mimeType}`));
        } else {
          resolve(blob);
        }
      },
      mimeType,
      quality,
    );
  });
}

export async function exportImageAsBlob(
  imageData: ImageData,
  format: 'png' | 'jpg' | 'gb7',
): Promise<Blob> {
  if (format === 'gb7') {
    const bytes = encodeGb7(imageData);
    // encodeGb7 always allocates a plain ArrayBuffer; cast is safe
    return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
  }

  if (format === 'png') {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx === null) throw new Error('Не удалось создать canvas для PNG');
    ctx.putImageData(imageData, 0, 0);
    return canvasToBlob(canvas, 'image/png');
  }

  // JPG: two-canvas approach — putImageData bypasses compositing
  const canvasA = document.createElement('canvas');
  canvasA.width = imageData.width;
  canvasA.height = imageData.height;
  const ctxA = canvasA.getContext('2d');
  if (ctxA === null) throw new Error('Не удалось создать canvas A для JPG');
  ctxA.putImageData(imageData, 0, 0);

  const canvasB = document.createElement('canvas');
  canvasB.width = imageData.width;
  canvasB.height = imageData.height;
  const ctxB = canvasB.getContext('2d');
  if (ctxB === null) throw new Error('Не удалось создать canvas B для JPG');
  ctxB.fillStyle = '#ffffff';
  ctxB.fillRect(0, 0, canvasB.width, canvasB.height);
  ctxB.drawImage(canvasA, 0, 0);

  return canvasToBlob(canvasB, 'image/jpeg', 0.92);
}
