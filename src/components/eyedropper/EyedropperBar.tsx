import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { PixelInfo } from '../../app/store/imageTypes';

type Props = {
  pixel: PixelInfo | null;
};

export function EyedropperBar({ pixel }: Props) {
  return (
    <Box
      sx={{
        px: 2,
        py: 0.5,
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'primary.dark',
        flexShrink: 0,
        minHeight: 28,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      {pixel === null ? (
        <Typography
          variant="caption"
          sx={{ fontFamily: 'monospace', color: 'text.disabled' }}
        >
          Кликни на изображение для выбора цвета
        </Typography>
      ) : (
        <>
          <Box
            sx={{
              width: 20,
              height: 20,
              borderRadius: '3px',
              bgcolor: `rgba(${pixel.r},${pixel.g},${pixel.b},${(pixel.a / 255).toFixed(2)})`,
              border: '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              color: 'text.secondary',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {`X: ${pixel.x}  Y: ${pixel.y}   |   R: ${pixel.r}  G: ${pixel.g}  B: ${pixel.b}  A: ${pixel.a}   |   L*: ${pixel.lab.L.toFixed(1)}  a*: ${pixel.lab.a.toFixed(1)}  b*: ${pixel.lab.b.toFixed(1)}`}
          </Typography>
        </>
      )}
    </Box>
  );
}
