import { GB7_SIGNATURE, GB7_VERSION, GB7_HEADER_SIZE, GB7_FLAGS_HAS_MASK } from './gb7Constants';

export function validateGb7(data: ArrayBuffer): string | null {
  const bytes = new Uint8Array(data);

  if (bytes.length < GB7_HEADER_SIZE) {
    return `Файл слишком мал: ${bytes.length} байт (минимум ${GB7_HEADER_SIZE})`;
  }

  for (let i = 0; i < GB7_SIGNATURE.length; i++) {
    if (bytes[i] !== GB7_SIGNATURE[i]) {
      return 'Неверная сигнатура: файл не является GB7';
    }
  }

  if (bytes[4] !== GB7_VERSION) {
    return `Неподдерживаемая версия GB7: 0x${bytes[4].toString(16).padStart(2, '0')}`;
  }

  const flags = bytes[5];
  if ((flags & ~GB7_FLAGS_HAS_MASK) !== 0) {
    return `Неизвестные флаги в заголовке: 0x${flags.toString(16).padStart(2, '0')}`;
  }

  const view = new DataView(data);
  const width = view.getUint16(6, false);
  const height = view.getUint16(8, false);

  if (width === 0) return 'Ширина изображения равна нулю';
  if (height === 0) return 'Высота изображения равна нулю';

  if (view.getUint16(10, false) !== 0) {
    return 'Зарезервированные байты заголовка не равны нулю';
  }

  const pixelCount = width * height;
  const expectedSize = GB7_HEADER_SIZE + pixelCount;

  if (bytes.length !== expectedSize) {
    return `Неверный размер файла: ${bytes.length} байт (ожидается ${expectedSize})`;
  }

  return null;
}
