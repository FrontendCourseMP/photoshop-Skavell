// src/image/canvasUtils.ts
export function renderToCanvas(canvas: HTMLCanvasElement, imageData: ImageData): void {
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Не удалось получить 2D контекст canvas');
  ctx.putImageData(imageData, 0, 0);
}
