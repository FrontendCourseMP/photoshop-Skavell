import { describe, expect, it } from 'vitest';
import { gb7Model, getChannels, expandChannels, parsePngMetadata, parseJpegMetadata } from './channelModel';
import type { ChannelModel } from './channelModel';
import { applyLevels, makeDefaultSettings, updateLevels, buildLUT, calcGammaPos } from './levelsAdjustment';
import { computeHistogram } from './histogram';
import { applyKernel } from './kernelFilter';
import { applyChannelFilter } from './channelFilter';
import { encodeGb7 } from '../formats/gb7/encodeGb7';
import { decodeGb7 } from '../formats/gb7/decodeGb7';

const rgb: ChannelModel = { color: 'rgb', alpha: 'alpha', grayMax: 255 };
const img = (...pixels: number[][]) => new ImageData(new Uint8ClampedArray(pixels.flat()), pixels.length, 1);
function png(type: number, trns = false, depth = 8) {
  const bytes = new Uint8Array(trns ? 46 : 33);
  bytes.set([137,80,78,71,13,10,26,10]);
  bytes[11] = 13; bytes.set([73,72,68,82], 12); bytes[24] = depth; bytes[25] = type;
  if (trns) { bytes[36] = 1; bytes.set([116,82,78,83], 37); }
  return bytes;
}
describe('source channel structure', () => {
  it.each([[0,false,'gray'], [0,true,'gray,a'], [2,false,'r,g,b'], [2,true,'r,g,b,a'], [3,false,'r,g,b'], [3,true,'r,g,b,a'], [4,false,'gray,a'], [6,false,'r,g,b,a']] as const)('PNG type %s tRNS %s', (type, trns, keys) => {
    expect(getChannels(parsePngMetadata(png(type, trns)).channelModel).map(c => c.key).join(',')).toBe(keys);
  });
  it('retains alpha for opaque RGBA and exposes 16-bit sources as working 8-bit', () => {
    expect(parsePngMetadata(png(6, false, 16))).toEqual({ channelModel: rgb, colorDepth: '64-bit RGBA → 8-bit/channel' });
  });
  it.each([1,3,4])('JPEG %s components: CMYK is RGB, never alpha', components => {
    const bytes = new Uint8Array([255,216,255,192,0,8,8,0,1,0,1,components]);
    expect(getChannels(parseJpegMetadata(bytes).channelModel).map(c => c.key)).toEqual(components === 1 ? ['gray'] : ['r','g','b']);
  });
  it('GB7 has Gray with an independent optional mask', () => {
    expect(getChannels(gb7Model(false))).toEqual([{ key: 'gray', label: 'Gray', max: 127 }]);
    expect(getChannels(gb7Model(true)).map(c => c.key)).toEqual(['gray','a']);
  });
  it('rejects truncated chunks and invalid headers', () => {
    expect(() => parsePngMetadata(new Uint8Array(33))).toThrow();
    const bytes = png(6); bytes[11] = 255;
    expect(() => parsePngMetadata(bytes)).toThrow();
    expect(() => parseJpegMetadata(new Uint8Array(4))).toThrow();
  });
});
describe('independent Levels composition', () => {
  it('channel then Master has exact noncommutative pixels and untouched alpha', () => {
    const src = img([64,100,150,128]);
    let settings = makeDefaultSettings(rgb);
    settings = updateLevels(settings, 'r', { whitePoint: 128 });
    settings = updateLevels(settings, 'master', { blackPoint: 64 });
    expect(settings.r.whitePoint).toBe(128);
    expect(settings.master.whitePoint).toBe(255);
    expect([...applyLevels(src, rgb, settings).data]).toEqual([85,48,115,128]);
    expect([...src.data]).toEqual([64,100,150,128]);
    const reversed = updateLevels(updateLevels(makeDefaultSettings(rgb), 'master', { blackPoint: 64 }), 'r', { whitePoint: 128 });
    expect(applyLevels(src, rgb, reversed).data).toEqual(applyLevels(src, rgb, settings).data);
  });
  it.each(['r','g','b','a'] as const)('only %s changes', channel => {
    const settings = updateLevels(makeDefaultSettings(rgb), channel, { whitePoint: 128 });
    const expected = [64,64,64,64]; expected[['r','g','b','a'].indexOf(channel)] = 128;
    expect([...applyLevels(img([64,64,64,64]), rgb, settings).data]).toEqual(expected);
  });
  it('Gray + Master keeps RGB equal; neutral reopen is exact even for intermediate values', () => {
    const model = gb7Model(true), src = img([64,64,64,128]);
    const settings = updateLevels(updateLevels(makeDefaultSettings(model), 'gray', { whitePoint: 64 }), 'master', { gamma: 2 });
    const result = applyLevels(src, model, settings);
    expect([...result.data]).toEqual([180,180,180,128]);
    expect(applyLevels(result, model, makeDefaultSettings(model)).data).toEqual(result.data);
  });
  it('GB7 histogram uses 128 bins, working alpha uses 256 bins', () => {
    const src = img([0,0,0,0],[129,129,129,128],[255,255,255,255]);
    const hist = computeHistogram(src, 'gray', 127);
    expect(hist).toHaveLength(128); expect([hist[0],hist[64],hist[127]]).toEqual([1,1,1]);
    expect(computeHistogram(src,'a')[128]).toBe(1);
  });
  it('rejects equal/inverted bounds and keeps gamma strictly inside even a one-step interval', () => {
    expect(() => buildLUT(100,100,1)).toThrow(); expect(() => buildLUT(101,100,1)).toThrow();
    for (const gamma of [0.1,1,9.99]) { expect(calcGammaPos(126,127,gamma)).toBeGreaterThan(126); expect(calcGammaPos(126,127,gamma)).toBeLessThan(127); }
  });
});
describe('Gray, mask and filter/export policies', () => {
  const twice = [[0,0,0],[0,2,0],[0,0,0]];
  it('Gaussian impulse has exact weights; sharpen clips negative neighbours', () => {
    const source = new ImageData(3,3);
    source.data[16] = 160;
    const gaussian = applyKernel(source,[[1,2,1],[2,4,2],[1,2,1]],['r'],'black',true);
    expect([...gaussian.data].filter((_,i)=>i%4===0)).toEqual([10,20,10,20,40,20,10,20,10]);
    source.data[16] = 40;
    const sharp = applyKernel(source,[[0,-1,0],[-1,5,-1],[0,-1,0]],['r'],'black',false);
    expect([...sharp.data].filter((_,i)=>i%4===0)).toEqual([0,0,0,0,200,0,0,0,0]);
  });
  it.each([{keys:['gray']}, {keys:['a']}, {keys:['gray','a']}] as const)('selected $keys only; All expands including alpha', ({ keys }) => {
    const src = img([40,40,40,64]);
    const out = applyKernel(src, twice, expandChannels([...keys]), 'clamp', false);
    const gray = (keys as readonly string[]).includes('gray') ? 80 : 40;
    expect([...out.data]).toEqual([gray,gray,gray,(keys as readonly string[]).includes('a') ? 128 : 64]);
    expect([...src.data]).toEqual([40,40,40,64]);
  });
  it('shows alpha alone as opaque grayscale; missing alpha does not become a phantom mask', () => {
    const off = {r:false,g:false,b:false,a:true};
    expect([...applyChannelFilter(img([40,40,40,64]),off).data]).toEqual([64,64,64,255]);
    expect([...applyChannelFilter(img([40,40,40,255]),off,false).data]).toEqual([0,0,0,255]);
  });
  it('rounds Gray separately from thresholded mask, preserving an opaque mask structure', () => {
    const encoded = encodeGb7(img([128,128,128,127],[128,128,128,128]));
    expect([...encoded.slice(12)]).toEqual([64,192]);
    const decoded = decodeGb7(encoded.buffer as ArrayBuffer).imageData;
    expect([...decoded.data]).toEqual([129,129,129,0,129,129,129,255]);
    expect(encodeGb7(img([255,255,255,255]),true)[5]).toBe(1);
  });
  it.each(['x','y'])('Prewitt %s uses convolution orientation on a descending ramp', axis => {
    const data = Array.from({length:9},(_,i)=> { const v = 100 - (axis === 'x' ? i % 3 : Math.floor(i/3)) * 10; return [v,v,v,255]; });
    const src = new ImageData(new Uint8ClampedArray(data.flat()),3,3);
    const kernel = axis === 'x' ? [[-1,0,1],[-1,0,1],[-1,0,1]] : [[-1,-1,-1],[0,0,0],[1,1,1]];
    expect(applyKernel(src,kernel,['r'],'clamp',false).data[16]).toBe(60);
  });
});
