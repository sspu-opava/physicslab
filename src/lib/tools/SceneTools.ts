import type { BodyDefinition, BodyState, PhysicsDocument, SceneState, Vector2 } from '../document/types';
export type SceneTool = 'select' | 'pan' | 'rotate' | 'resize';
export interface SelectionBox { start: Vector2; end: Vector2 }
export function snap(value: number, interval: number): number { return interval > 0 ? Math.round(value / interval) * interval : value; }
export function hitTest(document: PhysicsDocument, states: SceneState, point: Vector2): BodyDefinition | undefined {
  return [...document.bodies].reverse().find(body => {
    const state = states[body.id]; if (!state) return false;
    const dx = point.x - state.position.x, dy = point.y - state.position.y;
    const x = dx * Math.cos(state.angle) + dy * Math.sin(state.angle), y = -dx * Math.sin(state.angle) + dy * Math.cos(state.angle);
    return body.fixtures.some(f => f.shape.type === 'circle' ? Math.hypot(x, y) <= f.shape.radius : Math.abs(x) <= f.shape.width / 2 && Math.abs(y) <= f.shape.height / 2);
  });
}
export function bodyBounds(body: BodyDefinition, state: BodyState) {
  let halfX = 0, halfY = 0;
  for (const { shape } of body.fixtures) {
    const x = shape.type === 'circle' ? shape.radius : (Math.abs(Math.cos(state.angle)) * shape.width + Math.abs(Math.sin(state.angle)) * shape.height) / 2;
    const y = shape.type === 'circle' ? shape.radius : (Math.abs(Math.sin(state.angle)) * shape.width + Math.abs(Math.cos(state.angle)) * shape.height) / 2;
    halfX = Math.max(halfX, x); halfY = Math.max(halfY, y);
  }
  return { minX: state.position.x - halfX, maxX: state.position.x + halfX, minY: state.position.y - halfY, maxY: state.position.y + halfY };
}
export function selectInBox(document: PhysicsDocument, states: SceneState, box: SelectionBox): string[] {
  const minX = Math.min(box.start.x, box.end.x), maxX = Math.max(box.start.x, box.end.x);
  const minY = Math.min(box.start.y, box.end.y), maxY = Math.max(box.start.y, box.end.y);
  return document.bodies.filter(body => {
    const state = states[body.id]; if (!state) return false;
    const bounds = bodyBounds(body, state);
    return bounds.minX >= minX && bounds.maxX <= maxX && bounds.minY >= minY && bounds.maxY <= maxY;
  }).map(body => body.id);
}

/** Pure tool transaction in world coordinates; UI forwards pointer events only. */
export class TransformGesture {
  private bodies: BodyDefinition[];
  readonly center: Vector2;
  constructor(bodies: BodyDefinition[], private start: Vector2, readonly tool: Exclude<SceneTool, 'pan'>) {
    this.bodies = structuredClone(bodies);
    this.center = { x: bodies.reduce((sum, body) => sum + body.position.x, 0) / bodies.length, y: bodies.reduce((sum, body) => sum + body.position.y, 0) / bodies.length };
  }
  update(point: Vector2, interval: number, constrain = false): BodyDefinition[] {
    const center = this.center;
    let angle = Math.atan2(point.y - center.y, point.x - center.x) - Math.atan2(this.start.y - center.y, this.start.x - center.x);
    angle = Math.atan2(Math.sin(angle), Math.cos(angle));
    if (constrain) angle = snap(angle, Math.PI / 12);
    const initialDistance = Math.hypot(this.start.x - center.x, this.start.y - center.y);
    const factor = Math.max(0.05, Math.min(20, 1 + (Math.hypot(point.x - center.x, point.y - center.y) - initialDistance) / Math.max(0.1, initialDistance)));
    return this.bodies.map(original => {
      const body = structuredClone(original), dx = original.position.x - center.x, dy = original.position.y - center.y;
      if (this.tool === 'select') {
        // Snap the primary anchor, preserving relative distances between selected bodies.
        const anchor = this.bodies[0].position;
        body.position.x += snap(anchor.x + point.x - this.start.x, interval) - anchor.x;
        body.position.y += snap(anchor.y + point.y - this.start.y, interval) - anchor.y;
      } else if (this.tool === 'rotate') {
        body.angle += angle;
        body.position = { x: center.x + dx * Math.cos(angle) - dy * Math.sin(angle), y: center.y + dx * Math.sin(angle) + dy * Math.cos(angle) };
      } else {
        body.position = { x: center.x + dx * factor, y: center.y + dy * factor };
        for (const fixture of body.fixtures) {
          if (fixture.shape.type === 'circle') fixture.shape.radius = Math.max(0.01, fixture.shape.radius * factor);
          else { fixture.shape.width = Math.max(0.02, fixture.shape.width * factor); fixture.shape.height = Math.max(0.02, fixture.shape.height * factor); }
        }
      }
      return body;
    });
  }
}
