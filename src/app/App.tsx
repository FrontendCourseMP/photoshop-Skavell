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
import { LevelsDialog } from '../components/levels/LevelsDialog';
import { ResizeDialog } from '../components/resize/ResizeDialog';
import { loadImageFile } from '../image/loadImageFile';
import { exportImageAsBlob } from '../image/exportImage';
import { applyChannelFilter } from '../image/channelFilter';
import { downloadBlob } from '../shared/utils/downloadBlob';
import { replaceExtension } from '../shared/utils/fileFormat';
import type { ExportFormat } from '../components/toolbar/ImageToolbar';
import type { PixelInfo } from './store/imageTypes';
import type { ChannelKey } from '../image/imageTypes';
import type { InterpolationMethod } from '../image/interpolation';

export default function App() {
  const [state, dispatch] = useReducer(imageReducer, initialState);
  const [isChannelPanelOpen, setIsChannelPanelOpen] = useState(false);
  const [isLevelsOpen, setIsLevelsOpen] = useState(false);
  const [isResizeOpen, setIsResizeOpen] = useState(false);
  const [levelsSnapshot, setLevelsSnapshot] = useState<ImageData | null>(null);
  const [displayZoom, setDisplayZoom] = useState<number | null>(null);

  // Recompute workingImageData when channels or image change.
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
      setDisplayZoom(null);  // reset before new image so controls disable until CanvasViewer reports zoom
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

  const handleEffectiveZoom = useCallback((zoom: number) => {
    setDisplayZoom(zoom);
  }, []);

  const handleInterpolationChange = useCallback((method: InterpolationMethod) => {
    dispatch({ type: 'SET_INTERPOLATION', payload: method });
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

  const handleOpenLevels = useCallback(() => {
    if (state.workingImageData === null || state.originalImage === null) return;
    setLevelsSnapshot(state.workingImageData);
    setIsLevelsOpen(true);
  }, [state.workingImageData, state.originalImage]);

  const handleApplyResize = useCallback(
    (payload: { imageData: ImageData; width: number; height: number }) => {
      dispatch({ type: 'RESIZE_IMAGE', payload });
      setIsResizeOpen(false);
    },
    [],
  );

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
          onOpenLevels={handleOpenLevels}
          onOpenResize={() => { setIsResizeOpen(true); }}
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
          interpolationMethod={state.interpolationMethod}
          onPixelPick={handlePixelPick}
          onEffectiveZoom={handleEffectiveZoom}
        />

        {state.activeTool === 'eyedropper' && (
          <EyedropperBar pixel={state.pickedPixel} />
        )}

        <StatusBar
          image={state.originalImage}
          effectiveZoom={displayZoom}
          interpolationMethod={state.interpolationMethod}
          hasImage={state.originalImage !== null}
          onZoom={handleZoom}
          onInterpolationChange={handleInterpolationChange}
        />

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

        {isLevelsOpen && state.originalImage !== null && levelsSnapshot !== null && (
          <LevelsDialog
            open={isLevelsOpen}
            originalImageData={state.originalImage.imageData}
            snapshotImageData={levelsSnapshot}
            onPreview={(imageData) => { dispatch({ type: 'SET_WORKING_IMAGE', payload: imageData }); }}
            onApply={(imageData) => { dispatch({ type: 'APPLY_LEVELS', payload: imageData }); }}
            onClose={() => { setIsLevelsOpen(false); }}
          />
        )}

        {isResizeOpen && state.originalImage !== null && (
          <ResizeDialog
            open={isResizeOpen}
            image={state.originalImage}
            interpolationMethod={state.interpolationMethod}
            onApply={handleApplyResize}
            onClose={() => { setIsResizeOpen(false); }}
          />
        )}
      </Box>
    </ThemeProvider>
  );
}
