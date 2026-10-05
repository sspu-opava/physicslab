import type { BodyState, PhysicsDocument, SceneState, SensorDefinition, SensorType } from '../document/types';
import type { InternalPluginDefinition } from '../plugins/types';

export interface SensorContext { state: BodyState; previous?: BodyState; dt?: number; gravity: { x: number; y: number } }
export interface SensorPlugin extends Omit<InternalPluginDefinition, 'parameters'> { type: SensorType; unit: string; read: (context: SensorContext) => number | null }
const kinetic = ({ state: s }: SensorContext) => s.mass === undefined || s.inertia === undefined ? null : (s.mass * (s.velocity.x ** 2 + s.velocity.y ** 2) + s.inertia * s.angularVelocity ** 2) / 2;
const potential = ({ state: s, gravity: g }: SensorContext) => s.mass === undefined ? null : -s.mass * (g.x * s.position.x + g.y * s.position.y);
export const sensorRegistry: readonly SensorPlugin[] = [
  { type: 'x', label: 'Poloha x', unit: 'm', read: c => c.state.position.x },
  { type: 'y', label: 'Poloha y', unit: 'm', read: c => c.state.position.y },
  { type: 'vx', label: 'Rychlost vx', unit: 'm/s', read: c => c.state.velocity.x },
  { type: 'vy', label: 'Rychlost vy', unit: 'm/s', read: c => c.state.velocity.y },
  { type: 'speed', label: 'Rychlost |v|', unit: 'm/s', read: c => Math.hypot(c.state.velocity.x, c.state.velocity.y) },
  ...(['x', 'y'] as const).map(axis => ({ type: `a${axis}` as SensorType, label: `Zrychlení a${axis}`, unit: 'm/s²', read: (c: SensorContext) => c.previous && c.dt && c.dt > 0 ? (c.state.velocity[axis] - c.previous.velocity[axis]) / c.dt : null })),
  { type: 'angle', label: 'Úhel', unit: 'rad', read: c => c.state.angle },
  { type: 'angularVelocity', label: 'Úhlová rychlost', unit: 'rad/s', read: c => c.state.angularVelocity },
  { type: 'kinetic', label: 'Kinetická energie', unit: 'J', read: kinetic },
  { type: 'potential', label: 'Potenciální energie', unit: 'J', read: potential },
  { type: 'energy', label: 'Mechanická energie', unit: 'J', read: c => { const k = kinetic(c), p = potential(c); return k === null || p === null ? null : k + p; } }
];
export function sensorPlugin(type: SensorType): SensorPlugin { const plugin = sensorRegistry.find(p => p.type === type); if (!plugin) throw new Error('Neznámá veličina senzoru.'); return plugin; }
export function validateSensor(sensor: SensorDefinition, document: PhysicsDocument): void {
  sensorPlugin(sensor.type);
  if (!document.bodies.some(b => b.id === sensor.bodyId)) throw new Error('Vyberte existující těleso senzoru.');
  if (!sensor.name.trim()) throw new Error('Zadejte název senzoru.');
}
export function readSensors(document: PhysicsDocument, state: SceneState, previous?: SceneState, dt?: number): Record<string, number | null> {
  return Object.fromEntries(document.sensors.map(sensor => {
    const body = state[sensor.bodyId];
    const value = sensor.enabled && body ? sensorPlugin(sensor.type).read({ state: body, previous: previous?.[sensor.bodyId], dt, gravity: document.world.gravity }) : null;
    return [sensor.id, value !== null && Number.isFinite(value) ? value : null];
  }));
}
