import type { MathOperation } from './types';

export interface MathNodePlugin {
  operation: MathOperation;
  label: string;
  inputs: readonly string[];
  evaluate: (values: readonly number[]) => number;
}

export const mathNodeRegistry: readonly MathNodePlugin[] = [
  { operation: 'add', label: 'Sčítání', inputs: ['a', 'b'], evaluate: ([a, b]) => a + b },
  { operation: 'subtract', label: 'Odčítání', inputs: ['a', 'b'], evaluate: ([a, b]) => a - b },
  { operation: 'multiply', label: 'Násobení', inputs: ['a', 'b'], evaluate: ([a, b]) => a * b },
  { operation: 'divide', label: 'Dělení', inputs: ['a', 'b'], evaluate: ([a, b]) => b === 0 ? Number.NaN : a / b },
  { operation: 'negate', label: 'Opačné znaménko', inputs: ['a'], evaluate: ([a]) => -a },
  { operation: 'abs', label: 'Absolutní hodnota', inputs: ['a'], evaluate: ([a]) => Math.abs(a) },
  { operation: 'sqrt', label: 'Odmocnina', inputs: ['a'], evaluate: ([a]) => a < 0 ? Number.NaN : Math.sqrt(a) },
  { operation: 'sin', label: 'Sinus', inputs: ['a'], evaluate: ([a]) => Math.sin(a) },
  { operation: 'cos', label: 'Kosinus', inputs: ['a'], evaluate: ([a]) => Math.cos(a) },
];
