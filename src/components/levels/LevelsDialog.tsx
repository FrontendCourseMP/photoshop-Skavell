import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
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
import { BarChart, Bar, YAxis, ResponsiveContainer } from 'recharts';
import { computeHistogram } from '../../image/histogram';
import { buildLUT, applyLUT } from '../../image/levelsAdjustment';
import type { HistChannel } from '../../image/histogram';
import type { ChannelLUTs } from '../../image/levelsAdjustment';

type ChannelSettings = { blackPoint: number; whitePoint: number; gamma: number };
type LevelsChannel = 'master' | 'r' | 'g' | 'b' | 'a';

const DEFAULT_SETTINGS: ChannelSettings = { blackPoint: 0, whitePoint: 255, gamma: 1.0 };

function makeDefaultSettings(): Record<LevelsChannel, ChannelSettings> {
  return {
    master: { ...DEFAULT_SETTINGS },
    r: { ...DEFAULT_SETTINGS },
    g: { ...DEFAULT_SETTINGS },
    b: { ...DEFAULT_SETTINGS },
    a: { ...DEFAULT_SETTINGS },
  };
}

const CHANNEL_LABELS: Record<LevelsChannel, string> = {
  master: 'Master', r: 'R', g: 'G', b: 'B', a: 'A',
};

type Props = {
  open: boolean;
  originalImageData: ImageData;
  snapshotImageData: ImageData;
  onPreview: (imageData: ImageData) => void;
  onApply: (imageData: ImageData) => void;
  onClose: () => void;
};

export function LevelsDialog({
  open,
  originalImageData,
  snapshotImageData,
  onPreview,
  onApply,
  onClose,
}: Props) {
  const [settings, setSettings] = useState<Record<LevelsChannel, ChannelSettings>>(makeDefaultSettings);
  const [activeChannel, setActiveChannel] = useState<LevelsChannel>('master');
  const [preview, setPreview] = useState(true);
  const [logScale, setLogScale] = useState(false);
  const rafRef = useRef<number | null>(null);

  // Reset all state when dialog opens
  useEffect(() => {
    if (open) {
      setSettings(makeDefaultSettings());
      setActiveChannel('master');
      setPreview(true);
      setLogScale(false);
    }
  }, [open]);

  const histData = useMemo(() => {
    const channel = activeChannel as HistChannel;
    const counts = computeHistogram(originalImageData, channel);
    return counts.map((count, x) => ({
      x,
      count: logScale ? Math.log1p(count) : count,
    }));
  }, [originalImageData, activeChannel, logScale]);

  const computeResult = useCallback((): ImageData => {
    const luts: ChannelLUTs = {
      r: buildLUT(settings.r.blackPoint, settings.r.whitePoint, settings.r.gamma),
      g: buildLUT(settings.g.blackPoint, settings.g.whitePoint, settings.g.gamma),
      b: buildLUT(settings.b.blackPoint, settings.b.whitePoint, settings.b.gamma),
      a: buildLUT(settings.a.blackPoint, settings.a.whitePoint, settings.a.gamma),
    };
    return applyLUT(originalImageData, luts);
  }, [settings, originalImageData]);

  // Re-run preview on every settings or preview toggle change
  useEffect(() => {
    if (!preview) {
      onPreview(snapshotImageData);
      return;
    }
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      onPreview(computeResult());
    });
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [preview, snapshotImageData, onPreview, computeResult]);

  function updateChannel(partial: Partial<ChannelSettings>) {
    if (activeChannel === 'master') {
      setSettings(prev => ({
        ...prev,
        r: { ...prev.r, ...partial },
        g: { ...prev.g, ...partial },
        b: { ...prev.b, ...partial },
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [activeChannel]: { ...prev[activeChannel], ...partial },
      }));
    }
  }

  function handleCancel() {
    onPreview(snapshotImageData);
    onClose();
  }

  function handleApply() {
    onApply(computeResult());
    onClose();
  }

  function handleReset() {
    setSettings(makeDefaultSettings());
  }

  // Display sliders for master channel using R settings (all three are kept in sync)
  const current: ChannelSettings = activeChannel === 'master' ? settings.r : settings[activeChannel];

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Уровни</DialogTitle>
      <DialogContent>

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
            {(['master', 'r', 'g', 'b', 'a'] as LevelsChannel[]).map(ch => (
              <ToggleButton key={ch} value={ch}>
                {CHANNEL_LABELS[ch]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

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
            mb: 2,
            bgcolor: 'background.default',
            borderRadius: 1,
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
              <YAxis hide domain={['auto', 'auto']} />
              <Bar dataKey="count" isAnimationActive={false} barSize={2} fill="#90caf9" />
            </BarChart>
          </ResponsiveContainer>
        </Box>

        {/* Input level sliders */}
        <Box sx={{ px: 1 }}>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Точка чёрного: {current.blackPoint}
          </Typography>
          <Slider
            min={0}
            max={current.whitePoint - 1}
            value={current.blackPoint}
            onChange={(_e, v) => { updateChannel({ blackPoint: v as number }); }}
            size="small"
            sx={{ color: 'grey.600' }}
          />

          <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
            Гамма: {current.gamma.toFixed(2)}
          </Typography>
          <Slider
            min={0.10}
            max={9.99}
            step={0.01}
            value={current.gamma}
            onChange={(_e, v) => { updateChannel({ gamma: v as number }); }}
            size="small"
          />

          <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
            Точка белого: {current.whitePoint}
          </Typography>
          <Slider
            min={current.blackPoint + 1}
            max={255}
            value={current.whitePoint}
            onChange={(_e, v) => { updateChannel({ whitePoint: v as number }); }}
            size="small"
            sx={{ color: 'grey.100' }}
          />
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
    </Dialog>
  );
}
