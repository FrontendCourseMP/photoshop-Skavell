import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { DraggableDialog } from '../dialogs/DraggableDialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Slider from '@mui/material/Slider';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { BarChart, Bar, YAxis, XAxis, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { computeHistogram } from '../../image/histogram';
import { applyLevels, makeDefaultSettings, updateLevels, calcGammaPos, calcGammaFromPos } from '../../image/levelsAdjustment';
import type { LevelsChannel, ChannelSettings } from '../../image/levelsAdjustment';
import { getChannels } from '../../image/channelModel';
import type { ChannelModel } from '../../image/channelModel';
import type { ActiveChannels } from '../../app/store/imageTypes';
import { applyChannelFilter } from '../../image/channelFilter';

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

export function LevelsDialog({
  open,
  channelModel,
  activeChannels,
  originalImageData,
  snapshotImageData,
  onPreview,
  onApply,
  onClose,
}: Props) {
  // Initial state matches defaults — no reset effect needed (dialog is conditionally mounted)
  const [settings, setSettings] = useState(() => makeDefaultSettings(channelModel));
  const [activeChannel, setActiveChannel] = useState<LevelsChannel>('master');
  const [preview, setPreview] = useState(true);
  const [logScale, setLogScale] = useState(false);
  const rafRef = useRef<number | null>(null);

  const channels = [{ key: 'master' as const, label: 'Master', max: channelModel.color === 'gray' ? channelModel.grayMax : 255 }, ...getChannels(channelModel)];
  const max = channels.find(ch => ch.key === activeChannel)!.max;
  const closedRef = useRef(false);

  const histData = useMemo(() => {
    const counts = computeHistogram(originalImageData, activeChannel, max);
    return counts.map((count, x) => ({
      x,
      count: logScale ? Math.log1p(count) : count,
    }));
  }, [originalImageData, activeChannel, logScale, max]);

  const computeResult = useCallback((): ImageData => {
    return applyLevels(originalImageData, channelModel, settings);
  }, [settings, originalImageData, channelModel]);

  // Re-run preview on settings or preview toggle change
  useEffect(() => {
    if (!preview) {
      onPreview(snapshotImageData);
      return;
    }
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!closedRef.current) onPreview(applyChannelFilter(computeResult(), activeChannels, channelModel.alpha !== 'none'));
    });
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [preview, snapshotImageData, onPreview, computeResult, activeChannels, channelModel]);

  function updateChannel(partial: Partial<ChannelSettings>) {
    setSettings(prev => updateLevels(prev, activeChannel, partial));
  }

  function handleCancel() {
    closedRef.current = true;
    onPreview(snapshotImageData);
    onClose();
  }

  function handleApply() {
    if (closedRef.current) return;
    closedRef.current = true;
    onApply(computeResult());
    onClose();
  }

  function handleReset() {
    setSettings(makeDefaultSettings(channelModel));
  }

  const current: ChannelSettings = settings[activeChannel];

  const gammaPos = calcGammaPos(current.blackPoint, current.whitePoint, current.gamma);
  const sliderValue: [number, number, number] = [current.blackPoint, gammaPos, current.whitePoint];

  function handleInputLevelsChange(_: Event, values: number | number[], thumb: number) {
    const v = values as number[];
    if (thumb === 0) updateChannel({ blackPoint: Math.min(Math.round(v[0]), current.whitePoint - 1) });
    if (thumb === 2) updateChannel({ whitePoint: Math.max(Math.round(v[2]), current.blackPoint + 1) });
    if (thumb === 1) updateChannel({ gamma: calcGammaFromPos(current.blackPoint, current.whitePoint, v[1]) });
  }

  return (
    <DraggableDialog open={open} onClose={handleCancel} maxWidth="sm" title="Уровни">
      <DialogContent>
        {channelModel.alpha === 'mask' && <Typography variant="caption" sx={{ display: 'block' }}>Mask / Alpha: рабочая шкала 0–255; при экспорте GB7 порог 128.</Typography>}

        {/* Channel selector */}
        <Box sx={{ mb: 2 }}>
          <ToggleButtonGroup
            value={activeChannel}
            exclusive
            onChange={(_e, val: LevelsChannel | null) => {
              if (val !== null) setActiveChannel(val);
            }}
            size="small"
          >
            {channels.map(ch => (
              <ToggleButton key={ch.key} value={ch.key}>
                {ch.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Typography variant="caption">Канал → Master; Master не меняет Alpha. Диапазон: 0–{max}.</Typography>
        {/* Log/Linear scale toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <ToggleButtonGroup
            value={logScale ? 'log' : 'linear'}
            exclusive
            onChange={(_e, val: string | null) => {
              if (val !== null) setLogScale(val === 'log');
            }}
            size="small"
          >
            <ToggleButton value="linear">Lin</ToggleButton>
            <ToggleButton value="log">Log</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Histogram */}
        <Box
          sx={{
            width: '100%',
            height: 120,
            bgcolor: 'background.default',
            borderRadius: '4px 4px 0 0',
            overflow: 'hidden',
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={histData}
              margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
              barCategoryGap={0}
              barGap={0}
            >
              <YAxis width={40} tick={{ fontSize: 10 }} />
              <XAxis dataKey="x" type="number" domain={[0, max]} ticks={[0, max]} tick={{ fontSize: 10 }} />
              <ChartTooltip formatter={value => logScale ? Math.round(Math.expm1(Number(value))) : value} />
              <Bar dataKey="count" isAnimationActive={false} barSize={2} fill="#90caf9" />
            </BarChart>
          </ResponsiveContainer>
        </Box>

        {/* Gradient scale bar — visual reference for the 0–255 input range */}
        <Box sx={{
          width: '100%',
          height: 10,
          background: 'linear-gradient(to right, #000000, #ffffff)',
        }} />

        {/* Input Levels: single 3-thumb slider (black point, gamma, white point) */}
        <Box sx={{ px: 1, mb: 0 }}>
          <Slider
            min={0}
            max={max}
            value={sliderValue}
            onChange={handleInputLevelsChange}
            disableSwap
            step={1}
            getAriaLabel={i => ['Чёрная точка', 'Гамма', 'Белая точка'][i]}
            size="small"
            track={false}
            sx={{
              '& .MuiSlider-thumb:nth-of-type(3)': { color: '#222', border: '2px solid #888' },
              '& .MuiSlider-thumb:nth-of-type(4)': { color: '#888', border: '2px solid #bbb' },
              '& .MuiSlider-thumb:nth-of-type(5)': { color: '#fff', border: '2px solid #888' },
            }}
          />
        </Box>

        {/* Value labels below slider */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, px: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Чёрная: {current.blackPoint}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Гамма: {current.gamma.toFixed(2)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Белая: {current.whitePoint}
          </Typography>
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={preview}
              onChange={e => { setPreview(e.target.checked); }}
              size="small"
            />
          }
          label="Preview"
          sx={{ mt: 1 }}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={handleReset}>Сброс</Button>
        <Button onClick={handleCancel}>Отмена</Button>
        <Button variant="contained" onClick={handleApply}>
          Применить
        </Button>
      </DialogActions>
    </DraggableDialog>
  );
}
