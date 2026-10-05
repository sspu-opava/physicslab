import type { RecordedMeasurement } from './MeasurementRecorder';
export const curveColors = ['#49b5ff', '#f5bc62', '#66d5ad', '#ea86c2', '#b69bff', '#f58a7c'];
export function graphData(series: readonly RecordedMeasurement[]) {
  let min = Infinity, max = -Infinity, start = Infinity, end = -Infinity;
  for (const s of series) for (let i = 0; i < s.values.length; i++) { min = Math.min(min, s.values[i]); max = Math.max(max, s.values[i]); start = Math.min(start, s.timestamps[i]); end = Math.max(end, s.timestamps[i]); }
  if (!Number.isFinite(min)) return null;
  const pad = Math.max((max - min) * 0.08, Math.max(Math.abs(min), Math.abs(max)) * 0.01, 0.01);
  min -= pad; max += pad; if (end === start) end = start + 1;
  const paths = series.map(s => {
    const indices: number[] = [], stride = Math.max(1, Math.ceil(s.values.length / 350));
    // Preserve extrema when downsampling impacts for display.
    for (let i = 0; i < s.values.length; i += stride) {
      let low = i, high = i; const last = Math.min(i + stride, s.values.length);
      for (let j = i; j < last; j++) { if (s.values[j] < s.values[low]) low = j; if (s.values[j] > s.values[high]) high = j; }
      indices.push(...new Set([i, low, high, last - 1].sort((a,b) => a-b)));
    }
    return { id: s.id, point: s.values.length === 1 ? { x: 55 + (s.timestamps[0]-start)/(end-start)*710, y: 155-(s.values[0]-min)/(max-min)*140 } : null, path: indices.map((i,j) => `${j ? 'L' : 'M'}${(55 + (s.timestamps[i]-start)/(end-start)*710).toFixed(2)},${(155-(s.values[i]-min)/(max-min)*140).toFixed(2)}`).join(' ') };
  });
  return { min, max, start, end, paths };
}
