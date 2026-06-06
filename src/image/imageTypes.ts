export type ImageFormat = 'png' | 'jpg' | 'jpeg' | 'gb7';

/** Channel key used in ChannelPanel, buildChannelThumbnail and TOGGLE_CHANNEL action. */
export type ChannelKey = 'r' | 'g' | 'b' | 'a' | 'gray';

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
