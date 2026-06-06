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
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import type { ImageFormat } from '../../image/imageTypes';

export type ExportFormat = Extract<ImageFormat, 'png' | 'jpg' | 'gb7'>;

type Props = {
  hasImage: boolean;
  zoom: 'fit' | number;
  onLoad: (file: File) => void;
  onExport: (format: ExportFormat) => void;
  onZoom: (zoom: 'fit' | number) => void;
};

export function ImageToolbar({ hasImage, zoom, onLoad, onExport, onZoom }: Props) {
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
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', mr: 1, flexShrink: 0 }}>
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
          onClick={() => fileInputRef.current?.click()}
        >
          Открыть
        </Button>

        <Divider orientation="vertical" flexItem />

        <Button
          size="small"
          startIcon={<SaveAltIcon />}
          endIcon={<KeyboardArrowDownIcon />}
          disabled={!hasImage}
          onClick={(e) => setMenuAnchor(e.currentTarget)}
        >
          Экспорт
        </Button>
        <Menu
          anchorEl={menuAnchor}
          open={menuAnchor !== null}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem onClick={() => handleExportSelect('png')}>PNG</MenuItem>
          <MenuItem onClick={() => handleExportSelect('jpg')}>JPG</MenuItem>
          <MenuItem onClick={() => handleExportSelect('gb7')}>GB7</MenuItem>
        </Menu>

        <Box sx={{ flex: 1 }} />

        <Divider orientation="vertical" flexItem />

        <Button
          size="small"
          variant={zoom === 'fit' ? 'contained' : 'outlined'}
          disabled={!hasImage}
          onClick={() => onZoom('fit')}
          sx={{ minWidth: 48 }}
        >
          Fit
        </Button>
        <Button
          size="small"
          variant={zoom === 1.0 ? 'contained' : 'outlined'}
          disabled={!hasImage}
          onClick={() => onZoom(1.0)}
          sx={{ minWidth: 48 }}
        >
          100%
        </Button>
      </Toolbar>
    </AppBar>
  );
}
