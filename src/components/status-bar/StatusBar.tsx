import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import InputBase from '@mui/material/InputBase';
import Tooltip from '@mui/material/Tooltip';
import { useState } from 'react';
import type { SelectChangeEvent } from '@mui/material/Select';
import type { LoadedImage } from '../../image/imageTypes';
import type { InterpolationMethod } from '../../image/interpolation';

const ZOOM_PRESETS = [12, 25, 33, 50, 67, 75, 100, 150, 200, 300] as const;

const METHOD_LABELS: Record<InterpolationMethod, string> = {
  nearest: 'Ближайший сосед',
  bilinear: 'Билинейная',
};

const METHOD_TOOLTIPS: Record<InterpolationMethod, string> = {
  nearest: 'Берёт ближайший пиксель без смешивания. Резкие границы, подходит для пиксельной графики.',
  bilinear: 'Усредняет 4 соседних пикселя. Плавный результат, подходит для фото.',
};

type Props = {
  image: LoadedImage | null;
  effectiveZoom: number | null;
  interpolationMethod: InterpolationMethod;
  hasImage: boolean;
  onZoom: (zoom: 'fit' | number) => void;
  onInterpolationChange: (method: InterpolationMethod) => void;
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

export function StatusBar({
  image,
  effectiveZoom,
  interpolationMethod,
  hasImage,
  onZoom,
  onInterpolationChange,
}: Props) {
  const [inputValue, setInputValue] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  const disabled = !hasImage || effectiveZoom === null;
  const displayZoom = effectiveZoom ?? 100;

  function handleZoomPresetChange(e: SelectChangeEvent<number>) {
    onZoom(Number(e.target.value));
  }

  function handleSliderChange(_: Event, value: number | number[]) {
    onZoom(value as number);
  }

  function handleInputFocus() {
    setInputFocused(true);
    setInputValue(String(effectiveZoom ?? ''));
  }

  function handleInputBlur() {
    setInputFocused(false);
    const n = parseInt(inputValue, 10);
    if (!isNaN(n) && n >= 12 && n <= 300) {
      onZoom(n);
    }
    setInputValue('');
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      (e.currentTarget as HTMLInputElement).blur();
    }
  }

  function handleMethodChange(e: SelectChangeEvent<string>) {
    onInterpolationChange(e.target.value as InterpolationMethod);
  }

  // Determine select value: if effectiveZoom is a preset, use it; else use '' to show current value
  const presetValue: number | '' = effectiveZoom !== null && (ZOOM_PRESETS as readonly number[]).includes(effectiveZoom)
    ? effectiveZoom
    : '';

  return (
    <Box
      sx={{
        px: 2,
        py: 0.5,
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
        minHeight: 36,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontFamily: 'monospace',
          color: 'text.secondary',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
          minWidth: 0,
        }}
      >
        {image !== null ? buildStatusText(image) : 'Нет файла'}
      </Typography>

      {/* Interpolation method */}
      <Tooltip title={METHOD_TOOLTIPS[interpolationMethod]} placement="top">
        <span>
          <Select
            size="small"
            value={interpolationMethod}
            onChange={handleMethodChange}
            disabled={disabled}
            variant="standard"
            disableUnderline
            sx={{ fontSize: 11, color: 'text.secondary', minWidth: 130 }}
          >
            {(['bilinear', 'nearest'] as InterpolationMethod[]).map((m) => (
              <MenuItem key={m} value={m} sx={{ fontSize: 12 }}>
                {METHOD_LABELS[m]}
              </MenuItem>
            ))}
          </Select>
        </span>
      </Tooltip>

      {/* Zoom preset dropdown */}
      <Select
        size="small"
        value={presetValue}
        onChange={handleZoomPresetChange}
        disabled={disabled}
        variant="standard"
        disableUnderline
        displayEmpty
        sx={{ fontSize: 11, color: 'text.secondary', minWidth: 64 }}
        renderValue={(v) => ((v as number | '') === '' ? `${displayZoom}%` : `${v}%`)}
      >
        {ZOOM_PRESETS.map((p) => (
          <MenuItem key={p} value={p} sx={{ fontSize: 12 }}>
            {p}%
          </MenuItem>
        ))}
      </Select>

      {/* Zoom slider */}
      <Slider
        min={12}
        max={300}
        value={displayZoom}
        onChange={handleSliderChange}
        disabled={disabled}
        size="small"
        sx={{ width: 100, mx: 1 }}
      />

      {/* Zoom input */}
      <InputBase
        value={inputFocused ? inputValue : (effectiveZoom !== null ? `${effectiveZoom}%` : '')}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onChange={(e) => { setInputValue(e.target.value); }}
        onKeyDown={handleInputKeyDown}
        disabled={disabled}
        inputProps={{ style: { textAlign: 'right', fontSize: 11, width: 48 } }}
        sx={{ color: 'text.secondary' }}
      />
    </Box>
  );
}
