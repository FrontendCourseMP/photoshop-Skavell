import type { AppState, Action } from './imageTypes';
import { applyChannelFilter } from '../../image/channelFilter';

const DEFAULT_CHANNELS = { r: true, g: true, b: true, a: true } as const;

export const initialState: AppState = {
  originalImage: null,
  workingImageData: null,
  zoom: 'fit',
  error: null,
  notification: null,
  activeChannels: DEFAULT_CHANNELS,
  activeTool: 'none',
  pickedPixel: null,
  interpolationMethod: 'bilinear',
};

export function imageReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_IMAGE':
      return {
        ...state,
        originalImage: action.payload,
        workingImageData: action.payload.imageData,
        zoom: 'fit',
        error: null,
        activeChannels: DEFAULT_CHANNELS,
        activeTool: 'none',
        pickedPixel: null,
      };
    case 'SET_WORKING_IMAGE':
      return { ...state, workingImageData: action.payload };
    case 'SET_ZOOM':
      return { ...state, zoom: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_NOTIFICATION':
      return { ...state, notification: action.payload };
    case 'TOGGLE_CHANNEL': {
      if (action.payload === 'gray') {
        const allOn =
          state.activeChannels.r &&
          state.activeChannels.g &&
          state.activeChannels.b;
        const next = !allOn;
        return {
          ...state,
          activeChannels: { ...state.activeChannels, r: next, g: next, b: next },
          workingImageData: state.originalImage ? applyChannelFilter(state.originalImage.imageData, { ...state.activeChannels, r: next, g: next, b: next }, state.originalImage.channelModel.alpha !== 'none') : null,
        };
      }
      return {
        ...state,
        activeChannels: {
          ...state.activeChannels,
          [action.payload]: !state.activeChannels[action.payload],
        },
        workingImageData: state.originalImage ? applyChannelFilter(state.originalImage.imageData, { ...state.activeChannels, [action.payload]: !state.activeChannels[action.payload] }, state.originalImage.channelModel.alpha !== 'none') : null,
      };
    }
    case 'SET_TOOL':
      return {
        ...state,
        activeTool: action.payload,
        pickedPixel: action.payload === 'none' ? null : state.pickedPixel,
      };
    case 'SET_PICKED_PIXEL':
      return { ...state, pickedPixel: action.payload };
    case 'APPLY_LEVELS':
    case 'APPLY_KERNEL':
      if (state.originalImage === null) return state;
      return {
        ...state,
        originalImage: { ...state.originalImage, imageData: action.payload },
        workingImageData: applyChannelFilter(action.payload, state.activeChannels, state.originalImage.channelModel.alpha !== 'none'),
        pickedPixel: null,
      };
    case 'SET_INTERPOLATION':
      return { ...state, interpolationMethod: action.payload };
    case 'RESIZE_IMAGE':
      if (state.originalImage === null) return state;
      return {
        ...state,
        originalImage: {
          ...state.originalImage,
          imageData: action.payload.imageData,
          width: action.payload.width,
          height: action.payload.height,
        },
        workingImageData: applyChannelFilter(action.payload.imageData, state.activeChannels, state.originalImage.channelModel.alpha !== 'none'),
        pickedPixel: null,
      };
    default:
      return state;
  }
}
