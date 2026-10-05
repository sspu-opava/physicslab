import type { PhysicsGraphDefinition } from '../graph/types';

export interface Vector2 { x: number; y: number }
export interface WorldDefinition { gravity: Vector2; timeScale: number; pixelsPerMeter: number; background: string; backgroundAssetId: string | null }
export interface ProjectAsset { assetId: string; name: string; mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'; dataUrl: string; sizeBytes: number }
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
export interface ModuleDefinition { id: string; name?: string; type: string; enabled: boolean; parameters: Record<string, unknown> }
export type JointType = 'revolute' | 'distance' | 'prismatic' | 'weld';
interface JointBase {
  id: string; name: string; enabled: boolean; bodyAId: string; bodyBId: string;
  collideConnected: boolean; localAnchorA: Vector2; localAnchorB: Vector2;
}
export type JointDefinition = JointBase & (
  { type: 'distance'; length: number } |
  { type: 'revolute'; referenceAngle: number; enableLimit: boolean; lowerAngle: number; upperAngle: number } |
  { type: 'prismatic'; referenceAngle: number; localAxisA: Vector2; enableLimit: boolean; lowerTranslation: number; upperTranslation: number } |
  { type: 'weld'; referenceAngle: number }
);
export interface ForceDefinition extends ModuleDefinition { targetBodyIds: string[] }
export interface FieldDefinition extends ModuleDefinition {}
export type SensorType = 'x' | 'y' | 'vx' | 'vy' | 'speed' | 'ax' | 'ay' | 'angle' | 'angularVelocity' | 'kinetic' | 'potential' | 'energy';
export interface SensorDefinition { id: string; name: string; type: SensorType; enabled: boolean; bodyId: string }
export interface MeasurementDefinition { id: string; sensorId: string; sampleInterval: number; maxSamples?: number }
export interface PhysicsDocument {
  id: string; name: string; version: number; world: WorldDefinition; bodies: BodyDefinition[];
  joints: JointDefinition[]; forces: ForceDefinition[]; fields: FieldDefinition[]; assets: ProjectAsset[];
  sensors: SensorDefinition[]; measurements: MeasurementDefinition[]; physicsGraph: PhysicsGraphDefinition; createdAt: string; modifiedAt: string;
}
export interface BodyState { position: Vector2; centerOfMass?: Vector2; angle: number; velocity: Vector2; acceleration?: Vector2; angularVelocity: number; mass?: number; inertia?: number }
export type SceneState = Record<string, BodyState>;
