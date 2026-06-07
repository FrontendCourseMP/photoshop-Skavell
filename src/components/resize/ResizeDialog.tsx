import { useState } from 'react';
import type { ChangeEvent } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { SelectChangeEvent } from '@mui/material/Select';
import { scaleImageData } from '../../image/interpolation';
import type { InterpolationMethod } from '../../image/interpolation';
import type { LoadedImage } from '../../image/imageTypes';

type Unit = 'px' | '%';

type Props = {
  open: boolean;
  image: LoadedImage;
  interpolationMethod: InterpolationMethod;
  onApply: (payload: { imageData: ImageData; width: number; height: number }) => void;
  onClose: () => void;
};

const METHOD_LABELS: Record<InterpolationMethod, string> = {
  nearest: 'Ближайший сосед',
  bilinear: 'Билинейная',
};

const METHOD_TOOLTIPS: Record<InterpolationMethod, string> = {
  nearest: 'Берёт ближайший пиксель без смешивания. Резкие границы, подходит для пиксельной графики.',
  bilinear: 'Усредняет 4 соседних пикселя. Плавный результат, подходит для фото.',
};

function toMp(w: number, h: number): string {
  return (w * h / 1_000_000).toFixed(2);
}

export function ResizeDialog({ open, image, interpolationMethod, onApply, onClose }: Props) {
  const [unit, setUnit] = useState<Unit>('px');
  const [widthInput, setWidthInput] = useState(String(image.width));
  const [heightInput, setHeightInput] = useState(String(image.height));
  const [lockAspect, setLockAspect] = useState(true);
  const [localMethod, setLocalMethod] = useState<InterpolationMethod>(interpolationMethod);

  const origW = image.width;
  const origH = image.height;
  const aspect = origW / origH;


  // Validate and compute output px dimensions
  function parseInput(val: string): number | null {
    const n = parseInt(val, 10);
    if (isNaN(n) || n <= 0 || !Number.isFinite(n)) return null;
    return n;
  }

  function getOutputDimensions(): { w: number; h: number } | null {
    const wVal = parseInput(widthInput);
    const hVal = parseInput(heightInput);
    if (wVal === null || hVal === null) return null;
    if (unit === 'px') {
      if (wVal > 16000 || hVal > 16000) return null;
      return { w: wVal, h: hVal };
    }
    // percent mode
    if (wVal > 3000 || hVal > 3000) return null;
    const outW = Math.round(origW * wVal / 100);
    const outH = Math.round(origH * hVal / 100);
    if (outW < 1 || outH < 1 || outW > 16000 || outH > 16000) return null;
    return { w: outW, h: outH };
  }

  function getWidthError(): string | null {
    const n = parseInput(widthInput);
    if (n === null) return 'Введите целое число > 0';
    if (unit === 'px' && n > 16000) return 'Макс. 16000 пикселей';
    if (unit === '%' && n > 3000) return 'Макс. 3000%';
    if (unit === '%') {
      const outW = Math.round(origW * n / 100);
      if (outW > 16000) return `Результат ${outW}px > 16000`;
    }
    return null;
  }

  function getHeightError(): string | null {
    const n = parseInput(heightInput);
    if (n === null) return 'Введите целое число > 0';
    if (unit === 'px' && n > 16000) return 'Макс. 16000 пикселей';
    if (unit === '%' && n > 3000) return 'Макс. 3000%';
    if (unit === '%') {
      const outH = Math.round(origH * n / 100);
      if (outH > 16000) return `Результат ${outH}px > 16000`;
    }
    return null;
  }

  const widthError = getWidthError();
  const heightError = getHeightError();
  const outputDims = getOutputDimensions();
  const canApply = outputDims !== null && widthError === null && heightError === null;

  function handleUnitChange(e: SelectChangeEvent<Unit>) {
    const newUnit = e.target.value as Unit;
    // Convert current values to new unit
    const wPx = parseInput(widthInput);
    const hPx = parseInput(heightInput);
    if (newUnit === '%' && wPx !== null && hPx !== null) {
      setWidthInput(String(Math.round(wPx / origW * 100)));
      setHeightInput(String(Math.round(hPx / origH * 100)));
    } else if (newUnit === 'px' && wPx !== null && hPx !== null) {
      setWidthInput(String(Math.round(wPx * origW / 100)));
      setHeightInput(String(Math.round(hPx * origH / 100)));
    }
    setUnit(newUnit);
  }

  function handleWidthChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setWidthInput(val);
    if (!lockAspect) return;
    const n = parseInput(val);
    if (n === null) return;
    if (unit === 'px') {
      setHeightInput(String(Math.max(1, Math.round(n / aspect))));
    } else {
      setHeightInput(val); // proportional %
    }
  }

  function handleHeightChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setHeightInput(val);
    if (!lockAspect) return;
    const n = parseInput(val);
    if (n === null) return;
    if (unit === 'px') {
      setWidthInput(String(Math.max(1, Math.round(n * aspect))));
    } else {
      setWidthInput(val);
    }
  }

  function handleApply() {
    if (outputDims === null) return;
    const scaled = scaleImageData(image.imageData, outputDims.w, outputDims.h, localMethod);
    onApply({ imageData: scaled, width: outputDims.w, height: outputDims.h });
  }

  const unitLabel = unit === 'px' ? 'px' : '%';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Изменить размер изображения</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {/* Before / After info */}
          <Box>
            <Typography variant="caption" color="text.secondary">
              До: {origW} × {origH} пикс. ({toMp(origW, origH)} Мп)
            </Typography>
            <br />
            <Typography variant="caption" color="text.secondary">
              После:{' '}
              {outputDims !== null
                ? `${outputDims.w} × ${outputDims.h} пикс. (${toMp(outputDims.w, outputDims.h)} Мп)`
                : '—'}
            </Typography>
          </Box>

          {/* Unit selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ minWidth: 80 }}>Единицы:</Typography>
            <Select size="small" value={unit} onChange={handleUnitChange}>
              <MenuItem value="px">Пиксели</MenuItem>
              <MenuItem value="%">Проценты</MenuItem>
            </Select>
          </Box>

          {/* Width / Height */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
              <TextField
                label={`Ширина (${unitLabel})`}
                size="small"
                value={widthInput}
                onChange={handleWidthChange}
                error={widthError !== null}
                helperText={widthError ?? ''}
                slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              />
              <TextField
                label={`Высота (${unitLabel})`}
                size="small"
                value={heightInput}
                onChange={handleHeightChange}
                error={heightError !== null}
                helperText={heightError ?? ''}
                slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              />
            </Box>
            <Tooltip title={lockAspect ? 'Пропорции заблокированы' : 'Пропорции свободны'}>
              <IconButton
                size="small"
                onClick={() => { setLockAspect((v) => !v); }}
                color={lockAspect ? 'primary' : 'default'}
              >
                {lockAspect ? <LinkIcon /> : <LinkOffIcon />}
              </IconButton>
            </Tooltip>
          </Box>

          {/* Aspect ratio checkbox */}
          <FormControlLabel
            control={
              <Checkbox
                checked={lockAspect}
                onChange={(e) => { setLockAspect(e.target.checked); }}
                size="small"
              />
            }
            label={<Typography variant="body2">Сохранить пропорции</Typography>}
          />

          {/* Interpolation method */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ minWidth: 80 }}>Метод:</Typography>
            <Select
              size="small"
              value={localMethod}
              onChange={(e) => { setLocalMethod(e.target.value as InterpolationMethod); }}
            >
              {(['bilinear', 'nearest'] as InterpolationMethod[]).map((m) => (
                <MenuItem key={m} value={m}>{METHOD_LABELS[m]}</MenuItem>
              ))}
            </Select>
            <Tooltip title={METHOD_TOOLTIPS[localMethod]} placement="right">
              <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} />
            </Tooltip>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={handleApply} disabled={!canApply}>
          Применить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
