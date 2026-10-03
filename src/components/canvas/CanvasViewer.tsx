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
      effectiveZoom = Math.min(300, Math.max(12, Math.floor(scale * 100)));
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
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      const x = Math.max(
        0,
        Math.min(
          Math.floor((canvasX / rect.width) * originalImageData.width),
          originalImageData.width - 1,
        ),
      );
      const y = Math.max(
        0,
        Math.min(
          Math.floor((canvasY / rect.height) * originalImageData.height),
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
        minHeight: 0,
        overflow: 'auto',
        display: 'flex',
        alignItems: imageData === null ? 'center' : 'flex-start',
        justifyContent: imageData === null ? 'center' : 'flex-start',
        bgcolor: '#1a1a1a',
        p: 0,
      }}
    >
      {imageData === null ? (
        <Typography variant="body2" color="text.disabled">
          Нажми «Открыть» для загрузки изображения
        </Typography>
      ) : (
        <Box sx={{ m: 'auto', p: '50px', flexShrink: 0 }}>
        <canvas
          ref={canvasRef}
          aria-label="Изображение"
          onClick={handleClick}
          style={{
            display: 'block',
            outline: '1px solid #eee',
            boxShadow: '0 0 0 2px #333',
            backgroundColor: '#444',
            backgroundImage: 'conic-gradient(#383838 25%, transparent 0 50%, #383838 0 75%, transparent 0)',
            backgroundSize: '24px 24px',
            cursor: activeTool === 'eyedropper' ? 'crosshair' : 'default',
          }}
        />
        </Box>
      )}
    </Box>
  );
}
