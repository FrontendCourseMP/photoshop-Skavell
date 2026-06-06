import { GB7_SIGNATURE, GB7_VERSION, GB7_HEADER_SIZE, GB7_FLAGS_HAS_MASK } from './gb7Constants';

export function encodeGb7(imageData: ImageData): Uint8Array {
  const { width, height, data } = imageData;
  const pixelCount = width * height;

  let useMask = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) {
      useMask = true;
      break;
    }
  }

  const out = new Uint8Array(GB7_HEADER_SIZE + pixelCount);
  out.set(GB7_SIGNATURE, 0);
  out[4] = GB7_VERSION;
  out[5] = useMask ? GB7_FLAGS_HAS_MASK : 0x00;
  out[6] = (width >> 8) & 0xff;
  out[7] = width & 0xff;
  out[8] = (height >> 8) & 0xff;
  out[9] = height & 0xff;
  out[10] = 0;
  out[11] = 0;

  for (let i = 0; i < pixelCount; i++) {
    const px = i * 4;
    const r = data[px];
    const g = data[px + 1];
    const b = data[px + 2];
    const a = data[px + 3];

    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const gray7 = Math.round((luma / 255) * 127);
    const maskBit = useMask && a > 0 ? 0b1000_0000 : 0;
    out[GB7_HEADER_SIZE + i] = maskBit | gray7;
  }

  return out;
}
