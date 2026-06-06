import type { AppState, Action } from './imageTypes';

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
        // 'gray' is a GB7 convenience alias: toggles r+g+b together.
        // If all three are on → turn all off; otherwise → turn all on.
        const allOn =
          state.activeChannels.r &&
          state.activeChannels.g &&
          state.activeChannels.b;
        const next = !allOn;
        return {
          ...state,
          activeChannels: { ...state.activeChannels, r: next, g: next, b: next },
        };
      }
      return {
        ...state,
        activeChannels: {
          ...state.activeChannels,
          [action.payload]: !state.activeChannels[action.payload],
        },
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
    default:
      return state;
  }
}
