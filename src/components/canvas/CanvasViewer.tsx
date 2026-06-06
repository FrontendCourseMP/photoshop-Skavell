// src/components/canvas/CanvasViewer.tsx
import { useRef, useEffect, useCallback } from 'react';
import type { MouseEvent } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { renderToCanvas } from '../../image/canvasUtils';
import { rgbToLab } from '../../image/colorConvert';
import type { PixelInfo } from '../../app/store/imageTypes';

type Props = {
  imageData: ImageData | null;
  originalImageData: ImageData | null;
  zoom: 'fit' | number;
  activeTool: 'none' | 'eyedropper';
  onPixelPick: (info: PixelInfo) => void;
};

export function CanvasViewer({
  imageData,
  originalImageData,
  zoom,
  activeTool,
  onPixelPick,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || imageData === null) return;
    renderToCanvas(canvas, imageData);
  }, [imageData]);

  const handleClick = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      if (activeTool !== 'eyedropper' || originalImageData === null) return;
      const canvas = canvasRef.current;
      if (canvas === null) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / canvas.offsetWidth;
      const scaleY = canvas.height / canvas.offsetHeight;

      const x = Math.max(
        0,
        Math.min(
          Math.floor((e.clientX - rect.left) * scaleX),
          originalImageData.width - 1,
        ),
      );
      const y = Math.max(
        0,
        Math.min(
          Math.floor((e.clientY - rect.top) * scaleY),
          originalImageData.height - 1,
        ),
      );

      const idx = (y * originalImageData.width + x) * 4;
      const r = originalImageData.data[idx];
      const g = originalImageData.data[idx + 1];
      const b = originalImageData.data[idx + 2];
      const a = originalImageData.data[idx + 3];

      onPixelPick({ x, y, r, g, b, a, lab: rgbToLab(r, g, b) });
    },
    [activeTool, originalImageData, onPixelPick],
  );

  if (imageData === null) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#1a1a1a',
        }}
      >
        <Typography variant="body2" color="text.disabled">
          Нажми «Открыть» для загрузки изображения
        </Typography>
      </Box>
    );
  }

  const isFit = zoom === 'fit';

  return (
    <Box
      sx={{
        flex: 1,
        overflow: isFit ? 'hidden' : 'auto',
        display: 'flex',
        alignItems: isFit ? 'center' : 'flex-start',
        justifyContent: isFit ? 'center' : 'flex-start',
        bgcolor: '#1a1a1a',
        p: 1,
      }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{
          ...(isFit
            ? { maxWidth: '100%', maxHeight: '100%' }
            : {}),
          display: 'block',
          imageRendering: 'pixelated',
          cursor: activeTool === 'eyedropper' ? 'crosshair' : 'default',
        }}
      />
    </Box>
  );
}
