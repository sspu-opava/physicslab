import type { Vector2 } from '../document/types';
export interface Viewport { origin: Vector2; pixelsPerMeter: number; zoom: number }
export function worldToScreen(point: Vector2, view: Viewport): Vector2 {
  const scale = view.pixelsPerMeter * view.zoom;
  return { x: view.origin.x + point.x * scale, y: view.origin.y - point.y * scale };
}
export function screenToWorld(point: Vector2, view: Viewport): Vector2 {
  const scale = view.pixelsPerMeter * view.zoom;
  return { x: (point.x - view.origin.x) / scale, y: (view.origin.y - point.y) / scale };
}
