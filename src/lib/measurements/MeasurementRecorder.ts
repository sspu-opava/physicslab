import type { MeasurementDefinition, PhysicsDocument } from '../document/types';
import { sensorPlugin } from './SensorRegistry';
import type { PhysicsGraphNode } from '../graph/types';
export interface TimeSeries { timestamps: number[]; values: number[] }
export interface RecordedMeasurement extends TimeSeries { id: string; sensorId: string; name: string; unit: string; dropped: number; maxSamples: number }
export function validateMeasurement(measurement: MeasurementDefinition, document: PhysicsDocument): void {
  if (!document.sensors.some(s => s.id === measurement.sensorId)) throw new Error('Senzor měření neexistuje.');
  if (!Number.isFinite(measurement.sampleInterval) || measurement.sampleInterval < 1 / 120 || measurement.sampleInterval > 60) throw new Error('Interval musí být mezi 1/120 s a 60 s.');
  const max = measurement.maxSamples ?? 5000;
  if (!Number.isInteger(max) || max < 2 || max > 20000) throw new Error('Počet vzorků musí být od 2 do 20 000.');
}
export class MeasurementRecorder {
  series: RecordedMeasurement[] = [];
  private schedules = new Map<string, { interval: number; origin: number; index: number }>();
  reset(document: PhysicsDocument, origin = 0): void {
    this.schedules.clear();
    this.series = document.measurements.map(m => {
      validateMeasurement(m, document);
      const sensor = document.sensors.find(s => s.id === m.sensorId)!;
      this.schedules.set(m.id, { interval: m.sampleInterval, origin, index: 0 });
      return { id: m.id, sensorId: sensor.id, name: sensor.name, unit: sensorPlugin(sensor.type).unit, timestamps: [], values: [], dropped: 0, maxSamples: m.maxSamples ?? 5000 };
    });
  }
  sample(time: number, readings: Record<string, number | null>): void {
    for (const series of this.series) {
      if (series.id.startsWith('graph:')) continue;
      const schedule = this.schedules.get(series.id)!;
      if (time + 1e-10 < schedule.origin + schedule.index * schedule.interval) continue;
      schedule.index = Math.floor((time - schedule.origin + 1e-10) / schedule.interval) + 1;
      const value = readings[series.sensorId];
      if (value === null || value === undefined || !Number.isFinite(value)) continue;
      series.timestamps.push(time); series.values.push(value);
      if (series.values.length > series.maxSamples) { series.timestamps.shift(); series.values.shift(); series.dropped++; }
    }
  }
  addGraphMeasurements(nodes: readonly PhysicsGraphNode[], origin = 0): void {
    const graphNodes = nodes.filter((node): node is Extract<PhysicsGraphNode, { type: 'measurement' }> => node.type === 'measurement');
    this.series = this.series.filter(item => !item.id.startsWith('graph:'));
    for (const key of [...this.schedules.keys()]) if (key.startsWith('graph:')) this.schedules.delete(key);
    for (const node of graphNodes) {
      const id = `graph:${node.id}`;
      this.schedules.set(id, { interval: 1 / 30, origin, index: 0 });
      this.series.push({ id, sensorId: id, name: node.name, unit: node.unit, timestamps: [], values: [], dropped: 0, maxSamples: 5000 });
    }
  }
  sampleGraph(time: number, values: Record<string, number | null>): void {
    for (const series of this.series) {
      if (!series.id.startsWith('graph:')) continue;
      const schedule = this.schedules.get(series.id)!;
      if (time + 1e-10 < schedule.origin + schedule.index * schedule.interval) continue;
      schedule.index = Math.floor((time - schedule.origin + 1e-10) / schedule.interval) + 1;
      const value = values[series.id.slice('graph:'.length)];
      if (value === null || value === undefined || !Number.isFinite(value)) continue;
      series.timestamps.push(time); series.values.push(value);
      if (series.values.length > series.maxSamples) { series.timestamps.shift(); series.values.shift(); series.dropped++; }
    }
  }
}
export function exportMeasurements(series: readonly RecordedMeasurement[], format: 'csv' | 'json'): string {
  if (format === 'json') return JSON.stringify({ timeUnit: 's', measurements: series.map(({ maxSamples: _max, ...s }) => s) }, null, 2);
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return ['measurement_id,sensor_id,sensor_name,unit,time_s,value', ...series.flatMap(s => s.values.map((v, i) => [quote(s.id), quote(s.sensorId), quote(s.name), quote(s.unit), s.timestamps[i], v].join(',')))].join('\r\n');
}
