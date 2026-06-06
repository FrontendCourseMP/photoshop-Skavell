export type ImageFormat = 'png' | 'jpg' | 'jpeg' | 'gb7';

export type ColorDepth = '32-bit RGBA' | '7-bit grayscale';

export type LoadedImage = {
  name: string;
  format: ImageFormat;
  width: number;
  height: number;
  colorDepth: ColorDepth;
  imageData: ImageData;
  hasMask?: boolean;
};
