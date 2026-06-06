// src/app/App.tsx
import { useReducer } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import { theme } from './theme';
import { imageReducer, initialState } from './store/imageReducer';
import { ImageToolbar } from '../components/toolbar/ImageToolbar';
import { CanvasViewer } from '../components/canvas/CanvasViewer';
import { StatusBar } from '../components/status-bar/StatusBar';
import { AppSnackbar } from '../components/notifications/AppSnackbar';
import { loadImageFile } from '../image/loadImageFile';
import { exportImageAsBlob } from '../image/exportImage';
import { downloadBlob } from '../shared/utils/downloadBlob';
import { replaceExtension } from '../shared/utils/fileFormat';
import type { ExportFormat } from '../components/toolbar/ImageToolbar';

export default function App() {
  const [state, dispatch] = useReducer(imageReducer, initialState);

  async function handleLoad(file: File) {
    try {
      const image = await loadImageFile(file);
      dispatch({ type: 'LOAD_IMAGE', payload: image });
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : 'Ошибка загрузки файла',
      });
    }
  }

  async function handleExport(format: ExportFormat) {
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
  }

  function handleZoom(zoom: 'fit' | number) {
    dispatch({ type: 'SET_ZOOM', payload: zoom });
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <ImageToolbar
          hasImage={state.originalImage !== null}
          zoom={state.zoom}
          onLoad={handleLoad}
          onExport={handleExport}
          onZoom={handleZoom}
        />
        <CanvasViewer imageData={state.workingImageData} zoom={state.zoom} />
        <StatusBar image={state.originalImage} />
        <AppSnackbar
          message={state.error}
          severity="error"
          onClose={() => dispatch({ type: 'SET_ERROR', payload: null })}
        />
        <AppSnackbar
          message={state.notification}
          severity="success"
          onClose={() => dispatch({ type: 'SET_NOTIFICATION', payload: null })}
        />
      </Box>
    </ThemeProvider>
  );
}
