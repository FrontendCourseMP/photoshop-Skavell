// src/components/canvas/CanvasViewer.tsx
import { useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { renderToCanvas } from '../../image/canvasUtils';

type Props = {
  imageData: ImageData | null;
  zoom: 'fit' | number;
};

export function CanvasViewer({ imageData, zoom }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || imageData === null) return;
    renderToCanvas(canvas, imageData);
  }, [imageData]);

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
        style={
          isFit
            ? { maxWidth: '100%', maxHeight: '100%', display: 'block', imageRendering: 'pixelated' }
            : { display: 'block', imageRendering: 'pixelated' }
        }
      />
    </Box>
  );
}
