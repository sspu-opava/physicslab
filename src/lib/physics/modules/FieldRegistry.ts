import type { BodyDefinition, BodyState, FieldDefinition, SceneState, Vector2 } from '../../document/types';
import type { PhysicsEngineAdapter } from '../PhysicsEngineAdapter';
import type { InternalPluginDefinition, PluginParameterDefinition } from '../../plugins/types';

export interface VectorFieldContext {
  body: BodyDefinition;
  state: BodyState;
}

/** Each field evaluates an acceleration vector at a body's current state. */
export interface FieldPlugin extends InternalPluginDefinition {
  parameters: readonly PluginParameterDefinition[];
  create: (id: string) => FieldDefinition;
  validate: (field: FieldDefinition) => void;
  evaluate: (field: FieldDefinition, context: VectorFieldContext) => Vector2;
}

function number(parameters: Record<string, unknown>, key: string, min = -Infinity): number {
  const value = parameters[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) throw new Error(`Parametr ${key} musí být konečné číslo ≥ ${min}.`);
  return value;
}

function vector(parameters: Record<string, unknown>, key: string): Vector2 {
  return { x: number(parameters, `${key}X`), y: number(parameters, `${key}Y`) };
}

const field = (id: string, name: string, type: string, parameters: Record<string, unknown>): FieldDefinition => ({ id, name, type, enabled: true, parameters });

export const fieldRegistry: readonly FieldPlugin[] = [
  {
    type: 'gravity', label: 'Přídavná gravitace', description: 'Rovnoměrné zrychlení přičtené ke gravitaci světa.',
    parameters: [
      { key: 'accelerationX', label: 'Zrychlení x', unit: 'm/s²', defaultValue: 0, step: 0.1 },
      { key: 'accelerationY', label: 'Zrychlení y', unit: 'm/s²', defaultValue: -9.81, step: 0.1 },
    ],
    create: id => field(id, 'Přídavná gravitace', 'gravity', { accelerationX: 0, accelerationY: -9.81 }),
    validate: item => { vector(item.parameters, 'acceleration'); },
    evaluate: (item) => vector(item.parameters, 'acceleration'),
  },
  {
    type: 'wind', label: 'Vítr', description: 'Odpor úměrný rozdílu rychlosti tělesa a větru.',
    parameters: [
      { key: 'velocityX', label: 'Rychlost větru x', unit: 'm/s', defaultValue: 5, step: 0.1 },
      { key: 'velocityY', label: 'Rychlost větru y', unit: 'm/s', defaultValue: 0, step: 0.1 },
      { key: 'coefficient', label: 'Koeficient odporu', unit: 'kg/s', defaultValue: 0.5, min: 0, step: 0.01 },
    ],
    create: id => field(id, 'Vítr', 'wind', { velocityX: 5, velocityY: 0, coefficient: 0.5 }),
    validate: item => { vector(item.parameters, 'velocity'); number(item.parameters, 'coefficient', 0); },
    evaluate: (item, { body, state }) => {
      const wind = vector(item.parameters, 'velocity'), coefficient = number(item.parameters, 'coefficient', 0);
      return { x: coefficient * (wind.x - state.velocity.x) / body.mass, y: coefficient * (wind.y - state.velocity.y) / body.mass };
    },
  },
  {
    type: 'radialGravity', label: 'Radiální gravitace', description: 'Přitažlivé gravitační pole se středem a měknutím v okolí singularity.',
    parameters: [
      { key: 'centerX', label: 'Střed x', unit: 'm', defaultValue: 0, step: 0.1 },
      { key: 'centerY', label: 'Střed y', unit: 'm', defaultValue: 0, step: 0.1 },
      { key: 'strength', label: 'Gravitační parametr', unit: 'm³/s²', defaultValue: 30, min: 0, step: 1 },
      { key: 'softening', label: 'Měknutí', unit: 'm', defaultValue: 0.5, min: 0.01, step: 0.05 },
    ],
    create: id => field(id, 'Radiální gravitace', 'radialGravity', { centerX: 0, centerY: 0, strength: 30, softening: 0.5 }),
    validate: item => { number(item.parameters, 'centerX'); number(item.parameters, 'centerY'); number(item.parameters, 'strength', 0); number(item.parameters, 'softening', 0.01); },
    evaluate: (item, { body, state }) => {
      const dx = number(item.parameters, 'centerX') - state.position.x;
      const dy = number(item.parameters, 'centerY') - state.position.y;
      const softening = number(item.parameters, 'softening', 0.01);
      const radiusSquared = dx * dx + dy * dy + softening * softening;
      const magnitude = number(item.parameters, 'strength', 0) / (radiusSquared * Math.sqrt(radiusSquared));
      return { x: dx * magnitude, y: dy * magnitude };
    },
  },
];

export function fieldPlugin(type: string): FieldPlugin | undefined { return fieldRegistry.find(plugin => plugin.type === type); }

export function validateField(item: FieldDefinition): void {
  const plugin = fieldPlugin(item.type);
  if (!plugin) throw new Error(`Neznámý typ pole: ${item.type}`);
  plugin.validate(item);
}

export function applyFields(fields: readonly FieldDefinition[], bodies: readonly BodyDefinition[], states: SceneState, engine: PhysicsEngineAdapter): void {
  for (const item of fields) {
    if (!item.enabled) continue;
    const plugin = fieldPlugin(item.type);
    if (!plugin) continue;
    for (const body of bodies) {
      if (body.type !== 'dynamic') continue;
      const state = states[body.id];
      if (!state) continue;
      const acceleration = plugin.evaluate(item, { body, state });
      if (!Number.isFinite(acceleration.x) || !Number.isFinite(acceleration.y)) continue;
      engine.applyForce(body.id, { x: body.mass * acceleration.x, y: body.mass * acceleration.y });
    }
  }
}
