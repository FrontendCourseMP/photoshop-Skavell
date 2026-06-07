// src/components/toolbar/ImageToolbar.tsx
import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ColorizeIcon from '@mui/icons-material/Colorize';
import TuneIcon from '@mui/icons-material/Tune';
import TonalityIcon from '@mui/icons-material/Tonality';
import type { ImageFormat } from '../../image/imageTypes';

export type ExportFormat = Extract<ImageFormat, 'png' | 'jpg' | 'gb7'>;

type Props = {
  hasImage: boolean;
  zoom: 'fit' | number;
  activeTool: 'none' | 'eyedropper';
  isChannelPanelOpen: boolean;
  onLoad: (file: File) => void;
  onExport: (format: ExportFormat) => void;
  onZoom: (zoom: 'fit' | number) => void;
  onToolChange: (tool: 'none' | 'eyedropper') => void;
  onToggleChannelPanel: () => void;
  onOpenLevels: () => void;
};

export function ImageToolbar({
  hasImage,
  zoom,
  activeTool,
  isChannelPanelOpen,
  onLoad,
  onExport,
  onZoom,
  onToolChange,
  onToggleChannelPanel,
  onOpenLevels,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file !== undefined) onLoad(file);
    e.target.value = '';
  }

  function handleExportSelect(format: ExportFormat) {
    setMenuAnchor(null);
    onExport(format);
  }

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}
    >
      <Toolbar variant="dense" disableGutters sx={{ px: 2, gap: 1, minHeight: 48 }}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, color: 'primary.main', mr: 1, flexShrink: 0 }}
        >
          WebPhotoshop
        </Typography>

        <Divider orientation="vertical" flexItem />

        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.gb7"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <Button
          size="small"
          variant="contained"
          startIcon={<FolderOpenIcon />}
          onClick={() => { fileInputRef.current?.click(); }}
        >
          Открыть
        </Button>

        <Divider orientation="vertical" flexItem />

        <Button
          size="small"
          startIcon={<SaveAltIcon />}
          endIcon={<KeyboardArrowDownIcon />}
          disabled={!hasImage}
          onClick={(e) => { setMenuAnchor(e.currentTarget); }}
        >
          Экспорт
        </Button>
        <Menu
          anchorEl={menuAnchor}
          open={menuAnchor !== null}
          onClose={() => { setMenuAnchor(null); }}
        >
          <MenuItem onClick={() => { handleExportSelect('png'); }}>PNG</MenuItem>
          <MenuItem onClick={() => { handleExportSelect('jpg'); }}>JPG</MenuItem>
          <MenuItem onClick={() => { handleExportSelect('gb7'); }}>GB7</MenuItem>
        </Menu>

        <Divider orientation="vertical" flexItem />

        <Tooltip title={activeTool === 'eyedropper' ? 'Деактивировать пипетку' : 'Пипетка — выбрать цвет пикселя'}>
          <span>
            <Button
              size="small"
              variant={activeTool === 'eyedropper' ? 'contained' : 'outlined'}
              startIcon={<ColorizeIcon />}
              disabled={!hasImage}
              onClick={() => {
                onToolChange(activeTool === 'eyedropper' ? 'none' : 'eyedropper');
              }}
              aria-label="Пипетка"
            >
              Пипетка
            </Button>
          </span>
        </Tooltip>

        <Tooltip title={isChannelPanelOpen ? 'Скрыть панель каналов' : 'Показать панель каналов'}>
          <span>
            <Button
              size="small"
              variant={isChannelPanelOpen ? 'contained' : 'outlined'}
              startIcon={<TuneIcon />}
              disabled={!hasImage}
              onClick={onToggleChannelPanel}
              aria-label="Каналы"
            >
              Каналы
            </Button>
          </span>
        </Tooltip>

        <Tooltip title="Градационная коррекция — Уровни">
          <span>
            <Button
              size="small"
              variant="outlined"
              startIcon={<TonalityIcon />}
              disabled={!hasImage}
              onClick={onOpenLevels}
              aria-label="Уровни"
            >
              Уровни
            </Button>
          </span>
        </Tooltip>

        <Box sx={{ flex: 1 }} />

        <Divider orientation="vertical" flexItem />

        <Button
          size="small"
          variant={zoom === 'fit' ? 'contained' : 'outlined'}
          disabled={!hasImage}
          onClick={() => { onZoom('fit'); }}
          sx={{ minWidth: 48 }}
        >
          Fit
        </Button>
        <Button
          size="small"
          variant={zoom === 1.0 ? 'contained' : 'outlined'}
          disabled={!hasImage}
          onClick={() => { onZoom(1.0); }}
          sx={{ minWidth: 48 }}
        >
          100%
        </Button>
      </Toolbar>
    </AppBar>
  );
}
