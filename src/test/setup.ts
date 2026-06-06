// Polyfill for ImageData — jsdom does not include Canvas API globals
// unless the optional "canvas" npm package is installed.
if (typeof globalThis.ImageData === 'undefined') {
  class ImageDataPolyfill {
    readonly data: Uint8ClampedArray;
    readonly width: number;
    readonly height: number;

    constructor(width: number, height: number);
    constructor(array: Uint8ClampedArray, width: number, height?: number);
    constructor(
      arrayOrWidth: Uint8ClampedArray | number,
      widthOrHeight: number,
      height?: number,
    ) {
      if (typeof arrayOrWidth === 'number') {
        this.width = arrayOrWidth;
        this.height = widthOrHeight;
        this.data = new Uint8ClampedArray(arrayOrWidth * widthOrHeight * 4);
      } else {
        this.data = arrayOrWidth;
        this.width = widthOrHeight;
        this.height = height ?? Math.floor(arrayOrWidth.length / (widthOrHeight * 4));
      }
    }
  }

  Object.assign(globalThis, { ImageData: ImageDataPolyfill });
}
