import { describe, it, expect } from 'vitest';
import { validateGb7 } from './gb7Validation';

function makeValidGb7(width = 2, height = 2): ArrayBuffer {
  const buf = new ArrayBuffer(12 + width * height);
  const bytes = new Uint8Array(buf);
  const view = new DataView(buf);
  bytes[0] = 0x47; bytes[1] = 0x42; bytes[2] = 0x37; bytes[3] = 0x1d;
  bytes[4] = 0x01; // version
  bytes[5] = 0x00; // flags
  view.setUint16(6, width, false);
  view.setUint16(8, height, false);
  view.setUint16(10, 0, false); // reserved
  return buf;
}

describe('validateGb7', () => {
  it('returns null for a valid file', () => {
    expect(validateGb7(makeValidGb7())).toBeNull();
  });

  it('returns null for valid file with mask flag', () => {
    const buf = makeValidGb7(3, 3);
    new Uint8Array(buf)[5] = 0x01;
    expect(validateGb7(buf)).toBeNull();
  });

  it('rejects file smaller than 12 bytes', () => {
    expect(validateGb7(new ArrayBuffer(8))).not.toBeNull();
  });

  it('rejects wrong signature', () => {
    const buf = makeValidGb7();
    new Uint8Array(buf)[0] = 0x00;
    expect(validateGb7(buf)).not.toBeNull();
  });

  it('rejects unsupported version', () => {
    const buf = makeValidGb7();
    new Uint8Array(buf)[4] = 0x02;
    expect(validateGb7(buf)).not.toBeNull();
  });

  it('rejects unknown flags (reserved bits set)', () => {
    const buf = makeValidGb7();
    new Uint8Array(buf)[5] = 0b0000_0010;
    expect(validateGb7(buf)).not.toBeNull();
  });

  it('rejects zero width', () => {
    const buf = new ArrayBuffer(12); // no pixels, width=0
    const bytes = new Uint8Array(buf);
    const view = new DataView(buf);
    bytes[0] = 0x47; bytes[1] = 0x42; bytes[2] = 0x37; bytes[3] = 0x1d;
    bytes[4] = 0x01;
    view.setUint16(6, 0, false);
    view.setUint16(8, 2, false);
    expect(validateGb7(buf)).not.toBeNull();
  });

  it('rejects zero height', () => {
    const buf = new ArrayBuffer(12);
    const bytes = new Uint8Array(buf);
    const view = new DataView(buf);
    bytes[0] = 0x47; bytes[1] = 0x42; bytes[2] = 0x37; bytes[3] = 0x1d;
    bytes[4] = 0x01;
    view.setUint16(6, 2, false);
    view.setUint16(8, 0, false);
    expect(validateGb7(buf)).not.toBeNull();
  });

  it('rejects non-zero reserved bytes', () => {
    const buf = makeValidGb7();
    new DataView(buf).setUint16(10, 0x0001, false);
    expect(validateGb7(buf)).not.toBeNull();
  });

  it('rejects file with wrong pixel data size', () => {
    const buf = makeValidGb7(3, 3); // expects 12+9=21 bytes
    const truncated = buf.slice(0, 20); // 20 bytes — wrong
    expect(validateGb7(truncated)).not.toBeNull();
  });
});
