export type HistChannel = 'master' | 'r' | 'g' | 'b' | 'a';

export function computeHistogram(src: ImageData, channel: HistChannel): number[] {
  const hist = new Array<number>(256).fill(0);
  const data = src.data;
  for (let i = 0; i < data.length; i += 4) {
    let value: number;
    if (channel === 'master') {
      value = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    } else if (channel === 'r') {
      value = data[i];
    } else if (channel === 'g') {
      value = data[i + 1];
    } else if (channel === 'b') {
      value = data[i + 2];
    } else {
      value = data[i + 3];
    }
    hist[value]++;
  }
  return hist;
}
