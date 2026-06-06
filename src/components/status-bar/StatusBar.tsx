// src/components/status-bar/StatusBar.tsx
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { LoadedImage } from '../../image/imageTypes';

type Props = {
  image: LoadedImage | null;
};

function buildStatusText(image: LoadedImage): string {
  const parts: string[] = [
    image.name,
    image.format.toUpperCase(),
    `${image.width} × ${image.height}`,
    image.colorDepth,
  ];
  if (image.format === 'gb7') {
    parts.push(`mask: ${image.hasMask === true ? 'yes' : 'no'}`);
  }
  return parts.join(' | ');
}

export function StatusBar({ image }: Props) {
  return (
    <Box
      sx={{
        px: 2,
        py: 0.5,
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
        minHeight: 28,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontFamily: 'monospace', color: 'text.secondary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {image !== null ? buildStatusText(image) : 'Нет файла'}
      </Typography>
    </Box>
  );
}
