import { GB7_HEADER_SIZE, GB7_FLAGS_HAS_MASK } from './gb7Constants';
import type { Gb7Header } from './gb7Types';
import { validateGb7 } from './gb7Validation';

export type DecodeGb7Result = {
  header: Gb7Header;
  imageData: ImageData;
};

export function decodeGb7(data: ArrayBuffer): DecodeGb7Result {
  const error = validateGb7(data);
  if (error !== null) throw new Error(error);

  const bytes = new Uint8Array(data);
  const view = new DataView(data);

  const hasMask = (bytes[5] & GB7_FLAGS_HAS_MASK) !== 0;
  const width = view.getUint16(6, false);
  const height = view.getUint16(8, false);

  const imageData = new ImageData(width, height);
  const out = imageData.data;

  for (let i = 0; i < width * height; i++) {
    const byte = bytes[GB7_HEADER_SIZE + i];
    const gray7 = byte & 0b0111_1111;
    const gray8 = Math.round((gray7 / 127) * 255);
    const mask = (byte & 0b1000_0000) !== 0;

    const px = i * 4;
    out[px]     = gray8;
    out[px + 1] = gray8;
    out[px + 2] = gray8;
    out[px + 3] = hasMask ? (mask ? 255 : 0) : 255;
  }

  return {
    header: { version: bytes[4], hasMask, width, height },
    imageData,
  };
}
