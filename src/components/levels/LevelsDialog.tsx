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

/** Maps gamma value to a position in [blackPoint, whitePoint] on the 0–255 scale.
 *  Left of center (t < 0.5) = gamma > 1 = lightens. */
function calcGammaPos(black: number, white: number, gamma: number): number {
  if (white <= black + 1) return black + 1;
  const t = Math.pow(0.5, gamma);
  return Math.round(black + (white - black) * t);
}

/** Recovers gamma from slider position. */
function calcGammaFromPos(black: number, white: number, pos: number): number {
  const range = white - black;
  if (range <= 0) return 1.0;
  const t = Math.max(0.001, Math.min(0.999, (pos - black) / range));
  return Math.max(0.10, Math.min(9.99, Math.log(t) / Math.log(0.5)));
}

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
  // Initial state matches defaults — no reset effect needed (dialog is conditionally mounted)
  const [settings, setSettings] = useState<Record<LevelsChannel, ChannelSettings>>(makeDefaultSettings);
  const [activeChannel, setActiveChannel] = useState<LevelsChannel>('master');
  const [preview, setPreview] = useState(true);
  const [logScale, setLogScale] = useState(false);
  const rafRef = useRef<number | null>(null);

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

  // Re-run preview on settings or preview toggle change
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

  // Master channel displays R (all three are kept in sync)
  const current: ChannelSettings = activeChannel === 'master' ? settings.r : settings[activeChannel];

  const gammaPos = calcGammaPos(current.blackPoint, current.whitePoint, current.gamma);
  const sliderValue: [number, number, number] = [current.blackPoint, gammaPos, current.whitePoint];

  function handleInputLevelsChange(_: Event, newValues: number | number[]) {
    const [newBlack, newGammaPos, newWhite] = newValues as number[];

    if (newBlack !== current.blackPoint) {
      updateChannel({ blackPoint: newBlack });
    } else if (newWhite !== current.whitePoint) {
      updateChannel({ whitePoint: newWhite });
    } else if (newGammaPos !== gammaPos) {
      updateChannel({ gamma: calcGammaFromPos(current.blackPoint, current.whitePoint, newGammaPos) });
    }
  }

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
              <YAxis hide domain={['auto', 'auto']} />
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
            max={255}
            value={sliderValue}
            onChange={handleInputLevelsChange}
            disableSwap
            step={1}
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
    </Dialog>
  );
}
