import type { LoadedImage, ChannelKey } from '../../image/imageTypes';
import type { InterpolationMethod } from '../../image/interpolation';

export type ActiveChannels = {
  r: boolean;
  g: boolean;
  b: boolean;
  a: boolean;
};

export type PixelInfo = {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  a: number;
  lab: { L: number; a: number; b: number };
};

export type AppState = {
  originalImage: LoadedImage | null;
  workingImageData: ImageData | null;
  zoom: 'fit' | number;
  error: string | null;
  notification: string | null;
  activeChannels: ActiveChannels;
  activeTool: 'none' | 'eyedropper';
  pickedPixel: PixelInfo | null;
  interpolationMethod: InterpolationMethod;
};

export type Action =
  | { type: 'LOAD_IMAGE'; payload: LoadedImage }
  | { type: 'SET_WORKING_IMAGE'; payload: ImageData }
  | { type: 'SET_ZOOM'; payload: 'fit' | number }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_NOTIFICATION'; payload: string | null }
  | { type: 'TOGGLE_CHANNEL'; payload: ChannelKey }
  | { type: 'SET_TOOL'; payload: 'none' | 'eyedropper' }
  | { type: 'SET_PICKED_PIXEL'; payload: PixelInfo | null }
  | { type: 'APPLY_LEVELS'; payload: ImageData }
  | { type: 'APPLY_KERNEL'; payload: ImageData }
  | { type: 'SET_INTERPOLATION'; payload: InterpolationMethod }
  | { type: 'RESIZE_IMAGE'; payload: { imageData: ImageData; width: number; height: number } };
