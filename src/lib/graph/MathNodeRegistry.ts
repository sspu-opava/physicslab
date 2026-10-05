import { multiplyGraphUnits, powerGraphUnit, sameGraphUnit, squareRootGraphUnit } from './units';
import type { MathOperation } from './types';

export interface MathNodePlugin {
  operation: MathOperation;
  label: string;
  inputs: readonly string[];
  inferUnit: (units: readonly string[]) => string | undefined;
  evaluate: (values: readonly number[]) => number;
}

const unarySame = (units: readonly string[]) => units.length === 1 ? units[0] : undefined;
const sameInputs = (units: readonly string[]) => units.length === 2 && sameGraphUnit(units[0], units[1]) ? units[0] : undefined;
const dimensionlessUnary = (units: readonly string[]) => units.length === 1 && units[0] === '1' ? '1' : undefined;

export const mathNodeRegistry: readonly MathNodePlugin[] = [
  { operation: 'add', label: 'Sčítání', inputs: ['a', 'b'], inferUnit: sameInputs, evaluate: ([a, b]) => a + b },
  { operation: 'subtract', label: 'Odčítání', inputs: ['a', 'b'], inferUnit: sameInputs, evaluate: ([a, b]) => a - b },
  { operation: 'min', label: 'Minimum', inputs: ['a', 'b'], inferUnit: sameInputs, evaluate: ([a, b]) => Math.min(a, b) },
  { operation: 'max', label: 'Maximum', inputs: ['a', 'b'], inferUnit: sameInputs, evaluate: ([a, b]) => Math.max(a, b) },
  { operation: 'multiply', label: 'Násobení', inputs: ['a', 'b'], inferUnit: ([a, b]) => multiplyGraphUnits(a, b), evaluate: ([a, b]) => a * b },
  { operation: 'divide', label: 'Dělení', inputs: ['a', 'b'], inferUnit: ([a, b]) => multiplyGraphUnits(a, b, true), evaluate: ([a, b]) => b === 0 ? Number.NaN : a / b },
  { operation: 'atan2', label: 'Směr (atan2)', inputs: ['a', 'b'], inferUnit: units => sameInputs(units) ? 'rad' : undefined, evaluate: ([a, b]) => Math.atan2(a, b) },
  { operation: 'negate', label: 'Opačné znaménko', inputs: ['a'], inferUnit: unarySame, evaluate: ([a]) => -a },
  { operation: 'abs', label: 'Absolutní hodnota', inputs: ['a'], inferUnit: unarySame, evaluate: ([a]) => Math.abs(a) },
  { operation: 'square', label: 'Druhá mocnina', inputs: ['a'], inferUnit: ([a]) => powerGraphUnit(a, 2), evaluate: ([a]) => a * a },
  { operation: 'sqrt', label: 'Odmocnina', inputs: ['a'], inferUnit: ([a]) => squareRootGraphUnit(a), evaluate: ([a]) => a < 0 ? Number.NaN : Math.sqrt(a) },
  { operation: 'sin', label: 'Sinus', inputs: ['a'], inferUnit: ([a]) => a === 'rad' ? '1' : dimensionlessUnary([a]), evaluate: ([a]) => Math.sin(a) },
  { operation: 'cos', label: 'Kosinus', inputs: ['a'], inferUnit: ([a]) => a === 'rad' ? '1' : dimensionlessUnary([a]), evaluate: ([a]) => Math.cos(a) },
  { operation: 'exp', label: 'Exponenciála', inputs: ['a'], inferUnit: dimensionlessUnary, evaluate: ([a]) => Math.exp(a) },
  { operation: 'log', label: 'Přirozený logaritmus', inputs: ['a'], inferUnit: dimensionlessUnary, evaluate: ([a]) => a <= 0 ? Number.NaN : Math.log(a) },
];
