export const graphUnits = ['1', 'm', 'm/s', 'm/s²', 'kg', 'N', 'N·s', 'J', 'rad', 'rad/s'] as const;
export type GraphUnit = typeof graphUnits[number];
type Dimension = { length: number; mass: number; time: number; angle: number };

const dimensions: Record<GraphUnit, Dimension> = {
  '1': { length: 0, mass: 0, time: 0, angle: 0 },
  m: { length: 1, mass: 0, time: 0, angle: 0 },
  'm/s': { length: 1, mass: 0, time: -1, angle: 0 },
  'm/s²': { length: 1, mass: 0, time: -2, angle: 0 },
  kg: { length: 0, mass: 1, time: 0, angle: 0 },
  N: { length: 1, mass: 1, time: -2, angle: 0 },
  'N·s': { length: 1, mass: 1, time: -1, angle: 0 },
  J: { length: 2, mass: 1, time: -2, angle: 0 },
  rad: { length: 0, mass: 0, time: 0, angle: 1 },
  'rad/s': { length: 0, mass: 0, time: -1, angle: 1 },
};

const knownUnit = new Map(Object.entries(dimensions).map(([unit, value]) => [key(value), unit]));
const derivedDimensions = new Map<string, Dimension>();
function key(value: Dimension): string { return `${value.length},${value.mass},${value.time},${value.angle}`; }
function unitDimensions(value: string): Dimension | undefined { return dimensions[value as GraphUnit] ?? derivedDimensions.get(value); }
export function isGraphUnit(value: string): value is GraphUnit { return Object.prototype.hasOwnProperty.call(dimensions, value); }
export function sameGraphUnit(a: string, b: string): boolean { const left = unitDimensions(a), right = unitDimensions(b); return !!left && !!right && key(left) === key(right); }
export function multiplyGraphUnits(a: string, b: string, divide = false): string | undefined {
  const left = unitDimensions(a), right = unitDimensions(b); if (!left || !right) return;
  const sign = divide ? -1 : 1;
  return format({ length: left.length + sign * right.length, mass: left.mass + sign * right.mass, time: left.time + sign * right.time, angle: left.angle + sign * right.angle });
}
export function powerGraphUnit(unit: string, exponent: number): string | undefined {
  const value = unitDimensions(unit); if (!value) return;
  return format({ length: value.length * exponent, mass: value.mass * exponent, time: value.time * exponent, angle: value.angle * exponent });
}
export function squareRootGraphUnit(unit: string): string | undefined {
  const value = unitDimensions(unit); if (!value) return;
  if ([value.length, value.mass, value.time, value.angle].some(power => power % 2 !== 0)) return;
  return format({ length: value.length / 2, mass: value.mass / 2, time: value.time / 2, angle: value.angle / 2 });
}
function format(value: Dimension): string | undefined {
  const standard = knownUnit.get(key(value)); if (standard) return standard;
  const numerator: string[] = [], denominator: string[] = [];
  const factors: [string, number][] = [['kg', value.mass], ['m', value.length], ['rad', value.angle], ['s', value.time]];
  for (const [symbol, exponent] of factors) {
    if (!exponent) continue;
    const target = exponent < 0 ? denominator : numerator, power = Math.abs(exponent);
    target.push(power === 1 ? symbol : `${symbol}^${power}`);
  }
  if (!numerator.length) numerator.push('1');
  const unit = `${numerator.join('\u00b7')}${denominator.length ? `/${denominator.join('\u00b7')}` : ''}`;
  derivedDimensions.set(unit, value);
  return unit;
}
