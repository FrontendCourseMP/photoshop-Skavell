export type ImageFormat = 'png' | 'jpg' | 'jpeg' | 'gb7';

/** Channel key used in ChannelPanel, buildChannelThumbnail and TOGGLE_CHANNEL action. */
export type ChannelKey = 'r' | 'g' | 'b' | 'a' | 'gray';

/**
 * Human-readable color depth string, e.g. "24-bit RGB", "32-bit RGBA",
 * "8-bit grayscale", "48-bit RGB", "7-bit grayscale".
 * Derived from actual file headers, not hardcoded.
 */
export type ColorDepth = string;

export type LoadedImage = {
  name: string;
  format: ImageFormat;
  width: number;
  height: number;
  colorDepth: ColorDepth;
  imageData: ImageData;
  hasMask?: boolean;
  /** true if at least one pixel has alpha < 255 (png only; jpg is always false) */
  hasAlpha?: boolean;
};
