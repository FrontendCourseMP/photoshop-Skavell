import { expect, it } from 'vitest';
import { imageReducer, initialState } from './imageReducer';
import { gb7Model } from '../../image/channelModel';

it('load → hide alpha → preview → apply commits once with visibility already applied', () => {
  const src = new ImageData(new Uint8ClampedArray([64,64,64,128]),1,1);
  let state = imageReducer(initialState,{type:'LOAD_IMAGE',payload:{ name:'x.gb7',format:'gb7',width:1,height:1,colorDepth:'7-bit Gray + mask',imageData:src,channelModel:gb7Model(true),hasMask:true }});
  state = imageReducer(state,{type:'TOGGLE_CHANNEL',payload:'a'});
  expect([...state.workingImageData!.data]).toEqual([64,64,64,255]);
  const result = new ImageData(new Uint8ClampedArray([100,100,100,64]),1,1);
  state = imageReducer(state,{type:'SET_WORKING_IMAGE',payload:result});
  expect(state.originalImage!.imageData).toBe(src);
  state = imageReducer(state,{type:'APPLY_LEVELS',payload:result});
  expect(state.originalImage!.imageData).toBe(result);
  expect([...state.workingImageData!.data]).toEqual([100,100,100,255]);
  expect(state.originalImage!.channelModel).toEqual(gb7Model(true));
  state = imageReducer(state,{type:'TOGGLE_CHANNEL',payload:'a'});
  state = imageReducer(state,{type:'TOGGLE_CHANNEL',payload:'gray'});
  expect([...state.workingImageData!.data]).toEqual([64,64,64,255]);
  expect([...src.data]).toEqual([64,64,64,128]);
});
