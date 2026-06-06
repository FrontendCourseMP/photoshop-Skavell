import type { LoadedImage } from '../../image/imageTypes';

export type AppState = {
  originalImage: LoadedImage | null;
  workingImageData: ImageData | null;
  zoom: 'fit' | number;
  error: string | null;
  notification: string | null;
};

export type Action =
  | { type: 'LOAD_IMAGE'; payload: LoadedImage }
  | { type: 'SET_ZOOM'; payload: 'fit' | number }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_NOTIFICATION'; payload: string | null };
