export type MathOperation = 'add' | 'subtract' | 'multiply' | 'divide' | 'negate' | 'abs' | 'sqrt' | 'sin' | 'cos';

export type PhysicsGraphNode =
  | { id: string; type: 'sensor'; sensorId: string; label: string }
  | { id: string; type: 'constant'; value: number; label: string }
  | { id: string; type: 'math'; operation: MathOperation; label: string }
  | { id: string; type: 'force'; bodyId: string; label: string }
  | { id: string; type: 'measurement'; name: string; unit: string; label: string };

export interface PhysicsGraphConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  input: string;
}

export interface PhysicsGraphDefinition {
  nodes: PhysicsGraphNode[];
  connections: PhysicsGraphConnection[];
}

export const emptyPhysicsGraph = (): PhysicsGraphDefinition => ({ nodes: [], connections: [] });
