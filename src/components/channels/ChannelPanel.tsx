import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { buildChannelThumbnail } from '../../image/channelThumbnail';
import { renderToCanvas } from '../../image/canvasUtils';
import type { LoadedImage, ChannelKey } from '../../image/imageTypes';
import type { ActiveChannels } from '../../app/store/imageTypes';

type ChannelDef = {
  key: ChannelKey;
  label: string;
};

function getChannels(image: LoadedImage): ChannelDef[] {
  if (image.format === 'gb7') {
    const chs: ChannelDef[] = [{ key: 'gray', label: 'Gray' }];
    if (image.hasMask === true) {
      chs.push({ key: 'a', label: 'Alpha' });
    }
    return chs;
  }
  return [
    { key: 'r', label: 'R' },
    { key: 'g', label: 'G' },
    { key: 'b', label: 'B' },
    { key: 'a', label: 'A' },
  ];
}

function isActive(key: ChannelKey, activeChannels: ActiveChannels): boolean {
  if (key === 'gray') {
    return activeChannels.r && activeChannels.g && activeChannels.b;
  }
  return activeChannels[key as 'r' | 'g' | 'b' | 'a'];
}

type Props = {
  image: LoadedImage;
  activeChannels: ActiveChannels;
  onToggle: (channel: ChannelKey) => void;
};

export function ChannelPanel({ image, activeChannels, onToggle }: Props) {
  const canvasRefs = useRef<Map<ChannelKey, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    const channels = getChannels(image);
    channels.forEach(({ key }) => {
      const canvas = canvasRefs.current.get(key);
      if (canvas === undefined) return;
      try {
        const thumb = buildChannelThumbnail(image.imageData, key);
        renderToCanvas(canvas, thumb);
      } catch (err) {
        console.error('ChannelPanel: failed to render thumbnail', key, err);
      }
    });
  }, [image]);

  const channels = getChannels(image);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2,
        py: 1,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: 'text.disabled',
          textTransform: 'uppercase',
          fontSize: '0.6rem',
          letterSpacing: 1,
          flexShrink: 0,
        }}
      >
        Каналы
      </Typography>

      {channels.map(({ key, label }) => {
        const active = isActive(key, activeChannels);
        return (
          <Tooltip
            key={key}
            title={active ? `Скрыть канал ${label}` : `Показать канал ${label}`}
          >
            <Box
              role="button"
              tabIndex={0}
              onClick={() => { onToggle(key); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onToggle(key);
              }}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
                cursor: 'pointer',
                opacity: active ? 1 : 0.3,
                transition: 'opacity 0.15s',
                userSelect: 'none',
                outline: 'none',
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', borderRadius: 1 },
                '&:hover': { opacity: active ? 0.75 : 0.5 },
              }}
            >
              <canvas
                ref={(el) => {
                  if (el !== null) canvasRefs.current.set(key, el);
                }}
                style={{
                  height: 40,
                  width: 'auto',
                  maxWidth: 64,
                  border: `1px solid ${active ? '#555' : '#333'}`,
                  borderRadius: 2,
                  imageRendering: 'pixelated',
                  display: 'block',
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.65rem',
                  color: active ? 'text.primary' : 'text.disabled',
                }}
              >
                {label}
              </Typography>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}
