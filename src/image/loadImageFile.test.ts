import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { loadImageFile } from './loadImageFile';
import { getFormatFromBytes } from '../shared/utils/fileFormat';
import { encodeGb7 } from '../formats/gb7/encodeGb7';

const jpeg = new Uint8Array([255,216,255,224,0,4,74,70,255,192,0,8,8,0,1,0,1,3]);
const png = new Uint8Array(33);
png.set([137,80,78,71,13,10,26,10]);
png[11] = 13; png.set([73,72,68,82],12); png[24] = 8; png[25] = 6;
const createUrl = vi.fn(() => 'blob:test-image');
const revokeUrl = vi.fn();
let failDecode = false;

function file(bytes: Uint8Array, name: string, type: string): File {
  const result = new File([new Uint8Array(bytes)],name,{type});
  // jsdom File lacks arrayBuffer; keep the actual File name/type behavior.
  Object.defineProperty(result,'arrayBuffer',{value:async () => new Uint8Array(bytes).buffer});
  return result;
}
beforeEach(() => {
  failDecode = false; createUrl.mockClear(); revokeUrl.mockClear();
  vi.stubGlobal('URL',class extends URL {
    static createObjectURL = createUrl;
    static revokeObjectURL = revokeUrl;
  });
  vi.stubGlobal('Image',class {
    naturalWidth = 1; naturalHeight = 1;
    onload = () => {}; onerror = () => {};
    set src(_value: string) { queueMicrotask(() => failDecode ? this.onerror() : this.onload()); }
  });
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({
    drawImage:vi.fn(), getImageData:() => new ImageData(new Uint8ClampedArray([12,34,56,255]),1,1),
  } as unknown as CanvasRenderingContext2D);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it.each([
  {bytes:jpeg,name:'Lizard.png',type:'image/png',expected:'jpg'},
  {bytes:jpeg,name:'photo.jpeg',type:'',expected:'jpg'},
  {bytes:jpeg,name:'photo.gb7',type:'application/octet-stream',expected:'jpg'},
  {bytes:png,name:'image.jpg',type:'image/jpeg',expected:'png'},
  {bytes:png,name:'image.png',type:'application/octet-stream',expected:'png'},
] as const)('loads $name ($type) using $expected bytes and matching decoder metadata', async ({bytes,name,type,expected}) => {
  const result = await loadImageFile(file(bytes,name,type));
  expect(result.name).toBe(name);
  expect(result.format).toBe(expected);
  expect(result.channelModel).toEqual({color:'rgb',alpha:expected === 'png' ? 'alpha' : 'none',grayMax:255});
  expect(result.width).toBe(1); expect(result.height).toBe(1);
  const blob = createUrl.mock.calls[0] as unknown as [Blob];
  expect(blob[0].type).toBe(expected === 'png' ? 'image/png' : 'image/jpeg');
  expect(revokeUrl).toHaveBeenCalledWith('blob:test-image');
});
it('detects renamed GB7 and still validates its header', async () => {
  const bytes = encodeGb7(new ImageData(new Uint8ClampedArray([255,255,255,255]),1,1));
  const result = await loadImageFile(file(bytes,'gray.png','image/png'));
  expect(result.format).toBe('gb7'); expect(result.channelModel.color).toBe('gray');
  bytes[4] = 99;
  await expect(loadImageFile(file(bytes,'gray.png','image/png'))).rejects.toThrow();
  expect(createUrl).not.toHaveBeenCalled();
});
it('rejects unsupported bytes regardless of extension and rejects truncated PNG', async () => {
  expect(getFormatFromBytes(new Uint8Array())).toBeNull();
  await expect(loadImageFile(file(new Uint8Array([1,2,3]),'fake.png','image/png'))).rejects.toThrow('по содержимому');
  await expect(loadImageFile(file(png.slice(0,8),'broken.jpg','image/jpeg'))).rejects.toThrow('заголовок PNG');
  expect(createUrl).not.toHaveBeenCalled();
});
it('releases the URL when browser decoding fails', async () => {
  failDecode = true;
  await expect(loadImageFile(file(jpeg,'broken.png','image/png'))).rejects.toThrow('Не удалось загрузить');
  expect(revokeUrl).toHaveBeenCalledWith('blob:test-image');
});
