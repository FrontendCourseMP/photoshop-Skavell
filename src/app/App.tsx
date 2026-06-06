// src/app/App.tsx
import { useReducer, useEffect, useState, useCallback } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import { theme } from './theme';
import { imageReducer, initialState } from './store/imageReducer';
import { ImageToolbar } from '../components/toolbar/ImageToolbar';
import { CanvasViewer } from '../components/canvas/CanvasViewer';
import { StatusBar } from '../components/status-bar/StatusBar';
import { AppSnackbar } from '../components/notifications/AppSnackbar';
import { ChannelPanel } from '../components/channels/ChannelPanel';
import { EyedropperBar } from '../components/eyedropper/EyedropperBar';
import { loadImageFile } from '../image/loadImageFile';
import { exportImageAsBlob } from '../image/exportImage';
import { applyChannelFilter } from '../image/channelFilter';
import { downloadBlob } from '../shared/utils/downloadBlob';
import { replaceExtension } from '../shared/utils/fileFormat';
import type { ExportFormat } from '../components/toolbar/ImageToolbar';
import type { PixelInfo } from './store/imageTypes';
import type { ChannelKey } from '../image/imageTypes';

export default function App() {
  const [state, dispatch] = useReducer(imageReducer, initialState);
  const [isChannelPanelOpen, setIsChannelPanelOpen] = useState(false);

  // Recompute workingImageData when channels or image change.
  // LOAD_IMAGE already sets workingImageData directly to avoid flicker;
  // this effect runs after and produces the filtered version.
  useEffect(() => {
    if (state.originalImage === null) return;
    const filtered = applyChannelFilter(
      state.originalImage.imageData,
      state.activeChannels,
    );
    dispatch({ type: 'SET_WORKING_IMAGE', payload: filtered });
  }, [state.activeChannels, state.originalImage]);

  const handleLoad = useCallback(async (file: File) => {
    try {
      const image = await loadImageFile(file);
      dispatch({ type: 'LOAD_IMAGE', payload: image });
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : 'Ошибка загрузки файла',
      });
    }
  }, []);

  const handleExport = useCallback(async (format: ExportFormat) => {
    const { workingImageData, originalImage } = state;
    if (workingImageData === null || originalImage === null) return;
    try {
      const blob = await exportImageAsBlob(workingImageData, format);
      const filename = replaceExtension(originalImage.name, format);
      downloadBlob(blob, filename);
      dispatch({ type: 'SET_NOTIFICATION', payload: `Сохранено как ${filename}` });
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : 'Ошибка экспорта',
      });
    }
  }, [state.workingImageData, state.originalImage]);

  const handleZoom = useCallback((zoom: 'fit' | number) => {
    dispatch({ type: 'SET_ZOOM', payload: zoom });
  }, []);

  const handleToggleChannel = useCallback((channel: ChannelKey) => {
    dispatch({ type: 'TOGGLE_CHANNEL', payload: channel });
  }, []);

  const handleToolChange = useCallback((tool: 'none' | 'eyedropper') => {
    dispatch({ type: 'SET_TOOL', payload: tool });
  }, []);

  const handleToggleChannelPanel = useCallback(() => {
    setIsChannelPanelOpen((prev) => !prev);
  }, []);

  const handlePixelPick = useCallback((info: PixelInfo) => {
    dispatch({ type: 'SET_PICKED_PIXEL', payload: info });
  }, []);

  const handleCloseError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const handleCloseNotification = useCallback(() => {
    dispatch({ type: 'SET_NOTIFICATION', payload: null });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}
      >
        <ImageToolbar
          hasImage={state.originalImage !== null}
          zoom={state.zoom}
          activeTool={state.activeTool}
          isChannelPanelOpen={isChannelPanelOpen}
          onLoad={handleLoad}
          onExport={handleExport}
          onZoom={handleZoom}
          onToolChange={handleToolChange}
          onToggleChannelPanel={handleToggleChannelPanel}
        />

        {isChannelPanelOpen && state.originalImage !== null && (
          <ChannelPanel
            image={state.originalImage}
            activeChannels={state.activeChannels}
            onToggle={handleToggleChannel}
          />
        )}

        <CanvasViewer
          imageData={state.workingImageData}
          originalImageData={state.originalImage?.imageData ?? null}
          zoom={state.zoom}
          activeTool={state.activeTool}
          onPixelPick={handlePixelPick}
        />

        {state.activeTool === 'eyedropper' && (
          <EyedropperBar pixel={state.pickedPixel} />
        )}

        <StatusBar image={state.originalImage} />

        <AppSnackbar
          message={state.error}
          severity="error"
          onClose={handleCloseError}
        />
        <AppSnackbar
          message={state.notification}
          severity="success"
          onClose={handleCloseNotification}
        />
      </Box>
    </ThemeProvider>
  );
}
