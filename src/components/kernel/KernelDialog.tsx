import { useState, useEffect, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import type { EdgeStrategy, KernelChannel } from '../../image/kernelFilter';
import { useKernelWorker } from './useKernelWorker';

type PresetName = 'identity' | 'sharpen' | 'gaussian' | 'boxblur' | 'prewittX' | 'prewittY' | 'custom';
type RealPresetName = Exclude<PresetName, 'custom'>;

type PresetDef = { kernel: number[][]; normalize: boolean };

const PRESETS: Record<RealPresetName, PresetDef> = {
  identity: { kernel: [[0,0,0],[0,1,0],[0,0,0]], normalize: false },
  sharpen:  { kernel: [[0,-1,0],[-1,5,-1],[0,-1,0]], normalize: false },
  gaussian: { kernel: [[1,2,1],[2,4,2],[1,2,1]], normalize: true },
  boxblur:  { kernel: [[1,1,1],[1,1,1],[1,1,1]], normalize: true },
  prewittX: { kernel: [[-1,0,1],[-1,0,1],[-1,0,1]], normalize: false },
  prewittY: { kernel: [[-1,-1,-1],[0,0,0],[1,1,1]], normalize: false },
};

const PRESET_LABELS: Record<PresetName, string> = {
  identity: 'Identity',
  sharpen: 'Sharpen',
  gaussian: 'Gaussian 3×3',
  boxblur: 'Box Blur',
  prewittX: 'Prewitt X',
  prewittY: 'Prewitt Y',
  custom: 'Custom',
};

const PRESET_ORDER: PresetName[] = ['identity', 'sharpen', 'gaussian', 'boxblur', 'prewittX', 'prewittY', 'custom'];

type Props = {
  open: boolean;
  originalImageData: ImageData;
  snapshotImageData: ImageData;
  onPreview: (imageData: ImageData) => void;
  onApply: (imageData: ImageData) => void;
  onClose: () => void;
};

export function KernelDialog({
  open,
  originalImageData,
  snapshotImageData,
  onPreview,
  onApply,
  onClose,
}: Props) {
  const [kernelFields, setKernelFields] = useState<string[][]>(
    () => PRESETS.identity.kernel.map(row => row.map(String))
  );
  const [preset, setPreset] = useState<PresetName>('identity');
  const [lastPreset, setLastPreset] = useState<RealPresetName>('identity');
  const [normalize, setNormalize] = useState(false);
  const [channels, setChannels] = useState({ r: true, g: true, b: true, a: false });
  const [edge, setEdge] = useState<EdgeStrategy>('black');
  const [preview, setPreview] = useState(true);
  const rafRef = useRef<number>(0);

  const { run, isRunning } = useKernelWorker();


  function parseKernel(): number[][] | null {
    const result: number[][] = [];
    for (const row of kernelFields) {
      const parsedRow: number[] = [];
      for (const cell of row) {
        const v = parseFloat(cell);
        if (!isFinite(v)) return null;
        parsedRow.push(v);
      }
      result.push(parsedRow);
    }
    return result;
  }

  const allChecked = channels.r && channels.g && channels.b;
  const allIndeterminate = (channels.r || channels.g || channels.b) && !allChecked;

  function toggleAll() {
    const next = !allChecked;
    setChannels(prev => ({ ...prev, r: next, g: next, b: next }));
  }

  function getChannelList(): KernelChannel[] {
    const list: KernelChannel[] = [];
    if (channels.r) list.push('r');
    if (channels.g) list.push('g');
    if (channels.b) list.push('b');
    if (channels.a) list.push('a');
    return list;
  }

  // Preview effect with RAF debounce + isRunning guard
  useEffect(() => {
    if (!preview) {
      onPreview(snapshotImageData);
      return;
    }

    if (rafRef.current !== 0) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const kernel = parseKernel();
      if (kernel === null) return;
      const channelList = getChannelList();
      if (channelList.length === 0) return;

      run({
        buffer: originalImageData.data.buffer,
        width: originalImageData.width,
        height: originalImageData.height,
        kernel,
        channels: channelList,
        edge,
        normalize,
      })
        .then((result) => { onPreview(result); })
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          // other errors: ignore for preview
        });
    });

    return () => {
      if (rafRef.current !== 0) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, kernelFields, channels, edge, normalize, originalImageData, snapshotImageData, onPreview, run]);

  function handleApply() {
    if (rafRef.current !== 0) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    const kernel = parseKernel();
    if (kernel === null) return;
    const channelList = getChannelList();
    if (channelList.length === 0) return;

    run({
      buffer: originalImageData.data.buffer,
      width: originalImageData.width,
      height: originalImageData.height,
      kernel,
      channels: channelList,
      edge,
      normalize,
    })
      .then((result) => {
        onApply(result);
        onClose();
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      });
  }

  function handleCancel() {
    onPreview(snapshotImageData);
    onClose();
  }

  function handleReset() {
    const p = PRESETS[lastPreset];
    setKernelFields(p.kernel.map(row => row.map(String)));
    setNormalize(p.normalize);
    setPreset(lastPreset);
  }

  function handlePresetChange(name: PresetName) {
    setPreset(name);
    if (name !== 'custom') {
      setLastPreset(name);
      const p = PRESETS[name];
      setKernelFields(p.kernel.map(row => row.map(String)));
      setNormalize(p.normalize);
    }
  }

  function handleFieldChange(row: number, col: number, value: string) {
    setKernelFields(prev => {
      const next = prev.map(r => [...r]);
      next[row][col] = value;
      return next;
    });
    setPreset('custom');
  }

  const kernelIsValid = parseKernel() !== null;
  const channelList = getChannelList();

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Ядра / Фильтры</DialogTitle>
      <DialogContent>

        {/* Preset Select */}
        <FormControl size="small" fullWidth sx={{ mb: 2 }}>
          <InputLabel>Пресет</InputLabel>
          <Select
            value={preset}
            label="Пресет"
            onChange={e => { handlePresetChange(e.target.value as PresetName); }}
          >
            {PRESET_ORDER.map(name => (
              <MenuItem key={name} value={name}>
                {PRESET_LABELS[name]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 3×3 kernel grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, my: 2 }}>
          {kernelFields.map((row, ri) =>
            row.map((cell, ci) => {
              const isError = !isFinite(parseFloat(cell));
              return (
                <TextField
                  key={`${ri}-${ci}`}
                  size="small"
                  value={cell}
                  error={isError}
                  slotProps={{ htmlInput: { style: { textAlign: 'center' } } }}
                  onChange={e => { handleFieldChange(ri, ci, e.target.value); }}
                />
              );
            })
          )}
        </Box>

        {/* Channel checkboxes */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          <Typography variant="caption" sx={{ mr: 0.5 }}>Каналы:</Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={allChecked}
                indeterminate={allIndeterminate}
                onChange={toggleAll}
                size="small"
              />
            }
            label="All"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={channels.r}
                onChange={e => { setChannels(prev => ({ ...prev, r: e.target.checked })); }}
                size="small"
              />
            }
            label="R"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={channels.g}
                onChange={e => { setChannels(prev => ({ ...prev, g: e.target.checked })); }}
                size="small"
              />
            }
            label="G"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={channels.b}
                onChange={e => { setChannels(prev => ({ ...prev, b: e.target.checked })); }}
                size="small"
              />
            }
            label="B"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={channels.a}
                onChange={e => { setChannels(prev => ({ ...prev, a: e.target.checked })); }}
                size="small"
              />
            }
            label="A"
          />
        </Box>

        {/* Edge strategy Select */}
        <FormControl size="small" sx={{ mb: 2, minWidth: 160 }}>
          <InputLabel>Края</InputLabel>
          <Select
            value={edge}
            label="Края"
            onChange={e => { setEdge(e.target.value as EdgeStrategy); }}
          >
            <MenuItem value="black">Чёрный</MenuItem>
            <MenuItem value="white">Белый</MenuItem>
            <MenuItem value="clamp">Копировать</MenuItem>
          </Select>
        </FormControl>

        {/* Normalize + Preview checkboxes */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={normalize}
                onChange={e => { setNormalize(e.target.checked); }}
                size="small"
              />
            }
            label="Нормализовать"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={preview}
                onChange={e => { setPreview(e.target.checked); }}
                size="small"
              />
            }
            label="Preview"
          />
        </Box>

      </DialogContent>

      <DialogActions>
        <Button onClick={handleReset} disabled={preset !== 'custom'}>Сброс</Button>
        <Button onClick={handleCancel}>Отмена</Button>
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={isRunning || !kernelIsValid || channelList.length === 0}
        >
          {isRunning ? 'Обработка...' : 'Применить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
