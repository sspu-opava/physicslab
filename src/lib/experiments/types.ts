import type { PhysicsDocument } from '../document/types';

export type ExperimentControlTarget =
  | { kind: 'gravityY' }
  | { kind: 'bodyVelocityX' | 'bodyVelocityY' | 'bodyMass' | 'bodyPositionX' | 'bodyPositionY'; bodyId: string }
  | { kind: 'springStiffness'; forceId: string };

export interface ExperimentControlDefinition {
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  target: ExperimentControlTarget;
}

export interface ExperimentDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  sceneTemplate: PhysicsDocument;
  controls: ExperimentControlDefinition[];
  measurements: string[];
}
