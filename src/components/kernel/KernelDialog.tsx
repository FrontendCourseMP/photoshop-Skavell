import { useState, useEffect, useRef, useMemo } from 'react';
import { DraggableDialog } from '../dialogs/DraggableDialog';
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
import type { EdgeStrategy } from '../../image/kernelFilter';
import { getChannels, expandChannels } from '../../image/channelModel';
import type { ChannelModel } from '../../image/channelModel';
import type { ChannelKey } from '../../image/imageTypes';
import type { ActiveChannels } from '../../app/store/imageTypes';
import { applyChannelFilter } from '../../image/channelFilter';
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
  identity: 'Единичное ядро',
  sharpen: 'Повышение резкости',
  gaussian: 'Размытие по Гауссу 3×3',
  boxblur: 'Прямоугольное размытие',
  prewittX: 'Оператор Превитта X',
  prewittY: 'Оператор Превитта Y',
  custom: 'Произвольное',
};

const PRESET_ORDER: PresetName[] = ['identity', 'sharpen', 'gaussian', 'boxblur', 'prewittX', 'prewittY', 'custom'];

type Props = {
  open: boolean;
  channelModel: ChannelModel;
  activeChannels: ActiveChannels;
  originalImageData: ImageData;
  snapshotImageData: ImageData;
  onPreview: (imageData: ImageData) => void;
  onApply: (imageData: ImageData) => void;
  onClose: () => void;
};

export function KernelDialog({
  open,
  channelModel,
  activeChannels,
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
  const available = useMemo(() => getChannels(channelModel), [channelModel]);
  const [channels, setChannels] = useState<ChannelKey[]>(() => available.filter(ch => ch.key !== 'a').map(ch => ch.key));
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const closedRef = useRef(false);
  const applyingRef = useRef(false);
  const revisionRef = useRef(0);
  const [edge, setEdge] = useState<EdgeStrategy>('black');
  const [preview, setPreview] = useState(true);
  const rafRef = useRef<number>(0);

  const { run, cancel, isRunning } = useKernelWorker();


  const kernel = useMemo(() => {
    const parsed = kernelFields.map(row => row.map(cell => cell.trim() === '' ? NaN : Number(cell)));
    return parsed.flat().every(Number.isFinite) ? parsed : null;
  }, [kernelFields]);
  const channelList = useMemo(() => expandChannels(channels), [channels]);
  const allChecked = channels.length === available.length;
  const allIndeterminate = channels.length > 0 && !allChecked;
  function toggleAll() {
    setChannels(allChecked ? [] : available.map(ch => ch.key));
  }

  useEffect(() => {
    const revision = ++revisionRef.current;
    if (!preview || kernel === null || channelList.length === 0) {
      onPreview(snapshotImageData);
      return;
    }
    rafRef.current = requestAnimationFrame(() => {
      run({ buffer: originalImageData.data.buffer, width: originalImageData.width, height: originalImageData.height, kernel, channels: channelList, edge, normalize })
        .then(result => {
          if (revision === revisionRef.current && !closedRef.current && !applyingRef.current) {
            setError(null);
            onPreview(applyChannelFilter(result, activeChannels, channelModel.alpha !== 'none'));
          }
        })
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          if (revision === revisionRef.current && !closedRef.current) setError(String(e));
        });
    });
    return () => {
      revisionRef.current = revision + 1;
      cancelAnimationFrame(rafRef.current);
      cancel();
    };
  }, [preview, kernel, channelList, edge, normalize, originalImageData, snapshotImageData, onPreview, run, cancel, activeChannels, channelModel]);

  function handleApply() {
    if (applyingRef.current || closedRef.current || kernel === null || channelList.length === 0) return;
    applyingRef.current = true;
    setApplying(true);
    ++revisionRef.current;
    cancelAnimationFrame(rafRef.current);
    run({ buffer: originalImageData.data.buffer, width: originalImageData.width, height: originalImageData.height, kernel, channels: channelList, edge, normalize })
      .then(result => {
        if (closedRef.current) return;
        closedRef.current = true;
        onApply(result);
        onClose();
      })
      .catch((e: unknown) => {
        if (closedRef.current) return;
        applyingRef.current = false;
        setApplying(false);
        if (!(e instanceof DOMException && e.name === 'AbortError')) setError(String(e));
      });
  }

  function handleCancel() {
    closedRef.current = true;
    ++revisionRef.current;
    cancelAnimationFrame(rafRef.current);
    cancel();
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

  const kernelIsValid = kernel !== null;

  return (
    <DraggableDialog open={open} onClose={handleCancel} maxWidth="sm" title="Ядра / Фильтры">
      <DialogContent>
        {channelModel.alpha === 'mask' && <Typography variant="caption" sx={{ display: 'block' }}>Mask / Alpha: рабочая шкала 0–255; при экспорте GB7 порог 128.</Typography>}
        {error && <Typography color="error">{error}</Typography>}
        <Box component="fieldset" disabled={applying} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
        <Typography variant="caption">All включает все каналы, в том числе Alpha. Изначально выбраны только цветовые.</Typography>

        {/* Preset Select */}
        <FormControl size="small" fullWidth sx={{ mb: 2, mt: 1 }}>
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
              const isError = cell.trim() === '' || !Number.isFinite(Number(cell));
              return (
                <TextField
                  key={`${ri}-${ci}`}
                  size="small"
                  value={cell}
                  error={isError}
                  slotProps={{ htmlInput: { 'aria-label': `Ядро ${ri + 1},${ci + 1}`, style: { textAlign: 'center' } } }}
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
          {available.map(ch => (
            <FormControlLabel key={ch.key} label={ch.label} control={
              <Checkbox size="small" checked={channels.includes(ch.key)} onChange={e => setChannels(prev => e.target.checked ? [...prev, ch.key] : prev.filter(key => key !== ch.key))} />
            } />
          ))}
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

        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleReset} disabled={applying}>Сброс</Button>
        <Button onClick={handleCancel}>Отмена</Button>
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={applying || isRunning || !kernelIsValid || channelList.length === 0}
        >
          {isRunning ? 'Обработка...' : 'Применить'}
        </Button>
      </DialogActions>
    </DraggableDialog>
  );
}
