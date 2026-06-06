import type { AppState, Action } from './imageTypes';

export const initialState: AppState = {
  originalImage: null,
  workingImageData: null,
  zoom: 'fit',
  error: null,
  notification: null,
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
      };
    case 'SET_ZOOM':
      return { ...state, zoom: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_NOTIFICATION':
      return { ...state, notification: action.payload };
    default:
      return state;
  }
}
