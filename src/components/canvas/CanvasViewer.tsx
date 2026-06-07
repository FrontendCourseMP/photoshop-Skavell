// src/components/canvas/CanvasViewer.tsx
import { useRef, useEffect, useCallback, useState } from 'react';
import type { MouseEvent } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { renderToCanvas } from '../../image/canvasUtils';
import { scaleImageData } from '../../image/interpolation';
import type { InterpolationMethod } from '../../image/interpolation';
import { rgbToLab } from '../../image/colorConvert';
import type { PixelInfo } from '../../app/store/imageTypes';

type Props = {
  imageData: ImageData | null;
  originalImageData: ImageData | null;
  zoom: 'fit' | number;
  activeTool: 'none' | 'eyedropper';
  interpolationMethod: InterpolationMethod;
  onPixelPick: (info: PixelInfo) => void;
  onEffectiveZoom: (zoom: number) => void;
};

export function CanvasViewer({
  imageData,
  originalImageData,
  zoom,
  activeTool,
  interpolationMethod,
  onPixelPick,
  onEffectiveZoom,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerSizeRef = useRef({ w: 0, h: 0 });
  const rafIdRef = useRef<number>(0);
  const [resizeTick, setResizeTick] = useState(0);

  // Mount ResizeObserver once
  useEffect(() => {
    const el = containerRef.current;
    if (el === null) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry === undefined) return;
      containerSizeRef.current = {
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      };
      setResizeTick((t) => t + 1);
    });
    ro.observe(el);
    return () => { ro.disconnect(); };
  }, []);

  // Render effect: runs on image/zoom/method/container-size change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || imageData === null) return;

    const { w: cW, h: cH } = containerSizeRef.current;
    let effectiveZoom: number;

    if (zoom === 'fit' && cW > 0 && cH > 0) {
      const scale = Math.min(
        (cW - 100) / imageData.width,
        (cH - 100) / imageData.height,
      );
      effectiveZoom = Math.min(300, Math.max(12, Math.round(scale * 100)));
    } else if (typeof zoom === 'number') {
      effectiveZoom = zoom;
    } else {
      effectiveZoom = 100;
    }

    onEffectiveZoom(effectiveZoom);

    const dstW = Math.max(1, Math.round(imageData.width * effectiveZoom / 100));
    const dstH = Math.max(1, Math.round(imageData.height * effectiveZoom / 100));

    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      const scaled = scaleImageData(imageData, dstW, dstH, interpolationMethod);
      renderToCanvas(canvas, scaled);
    });

    return () => { cancelAnimationFrame(rafIdRef.current); };
  }, [imageData, zoom, interpolationMethod, resizeTick, onEffectiveZoom]);

  const handleClick = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      if (activeTool !== 'eyedropper' || originalImageData === null) return;
      const canvas = canvasRef.current;
      if (canvas === null) return;

      const rect = canvas.getBoundingClientRect();
      // canvas.width = scaled width; map click coordinates back to original image space
      const canvasX = Math.floor(e.clientX - rect.left);
      const canvasY = Math.floor(e.clientY - rect.top);

      const x = Math.max(
        0,
        Math.min(
          Math.floor((canvasX / canvas.width) * originalImageData.width),
          originalImageData.width - 1,
        ),
      );
      const y = Math.max(
        0,
        Math.min(
          Math.floor((canvasY / canvas.height) * originalImageData.height),
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

  return (
    <Box
      ref={containerRef}
      sx={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        alignItems: imageData === null ? 'center' : 'flex-start',
        justifyContent: imageData === null ? 'center' : 'flex-start',
        bgcolor: '#1a1a1a',
        p: imageData === null ? 0 : 1,
      }}
    >
      {imageData === null ? (
        <Typography variant="body2" color="text.disabled">
          Нажми «Открыть» для загрузки изображения
        </Typography>
      ) : (
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          style={{
            display: 'block',
            cursor: activeTool === 'eyedropper' ? 'crosshair' : 'default',
          }}
        />
      )}
    </Box>
  );
}
