export interface Vector2 { x: number; y: number }
export interface WorldDefinition { gravity: Vector2; timeScale: number; pixelsPerMeter: number; background: string }
export type ShapeDefinition = { type: 'circle'; radius: number } | { type: 'box'; width: number; height: number };
export interface FixtureDefinition { shape: ShapeDefinition; density: number; friction: number; restitution: number; category: number; mask: number }
export interface BodyDefinition {
  id: string; name: string; type: 'static' | 'dynamic' | 'kinematic';
  position: Vector2; angle: number; mass: number;
  linearDamping: number; angularDamping: number;
  initialVelocity: Vector2; initialAngularVelocity: number;
  fixtures: FixtureDefinition[];
  appearance: { fill: string; stroke: string; strokeWidth: number; opacity: number };
}
export interface ModuleDefinition { id: string; type: string; enabled: boolean; parameters: Record<string, unknown> }
export interface JointDefinition extends ModuleDefinition { bodyAId: string; bodyBId: string }
export interface ForceDefinition extends ModuleDefinition { targetBodyIds: string[] }
export interface SensorDefinition extends ModuleDefinition { bodyId: string }
export interface MeasurementDefinition { id: string; sensorId: string; sampleInterval: number }
export interface PhysicsDocument {
  id: string; name: string; version: number; world: WorldDefinition; bodies: BodyDefinition[];
  joints: JointDefinition[]; forces: ForceDefinition[]; fields: ModuleDefinition[];
  sensors: SensorDefinition[]; measurements: MeasurementDefinition[]; createdAt: string; modifiedAt: string;
}
export interface BodyState { position: Vector2; angle: number; velocity: Vector2; angularVelocity: number }
export type SceneState = Record<string, BodyState>;
