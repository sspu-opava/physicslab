import { Application, Graphics } from 'pixi.js';
import type { PhysicsDocument, SceneState, Vector2 } from '../document/types';
import { screenToWorld, worldToScreen, type Viewport } from '../units/coordinates';
export class PhysicsRenderer {
  private app = new Application();
  private grid = new Graphics();
  private bodies = new Graphics();
  private observer?: ResizeObserver;
  private ready = false;
  view: Viewport = { origin: { x: 0, y: 0 }, pixelsPerMeter: 100, zoom: 1 };
  async initialize(host: HTMLDivElement): Promise<void> {
    await this.app.init({ background: '#101e28', antialias: true, resolution: window.devicePixelRatio, autoDensity: true, preference: 'webgl', autoStart: false, width: host.clientWidth, height: host.clientHeight });
    host.appendChild(this.app.canvas); this.app.stage.addChild(this.grid, this.bodies); this.ready = true;
    this.resetView();
    this.observer = new ResizeObserver(() => { this.app.renderer.resize(host.clientWidth, host.clientHeight); });
    this.observer.observe(host);
  }
  resetView(): void {
    this.view.origin = { x: this.app.screen.width / 2, y: this.app.screen.height * 0.83 };
    this.view.zoom = Math.max(0.2, Math.min(1, (this.app.screen.height * 0.83 - 55) / (4.3 * this.view.pixelsPerMeter), (this.app.screen.width - 60) / (10 * this.view.pixelsPerMeter)));
  }
  pan(delta: Vector2): void { this.view.origin.x += delta.x; this.view.origin.y += delta.y; }
  zoomAt(point: Vector2, factor: number): void {
    const world = screenToWorld(point, this.view); this.view.zoom = Math.max(0.2, Math.min(4, this.view.zoom * factor));
    const next = worldToScreen(world, this.view); this.pan({ x: point.x - next.x, y: point.y - next.y });
  }
  render(document: PhysicsDocument, state: SceneState, selected: string, showGrid: boolean): void {
    if (!this.ready) return;
    this.view.pixelsPerMeter = document.world.pixelsPerMeter;
    const { width, height } = this.app.screen, scale = this.view.pixelsPerMeter * this.view.zoom;
    const { x: ox, y: oy } = this.view.origin;
    this.grid.clear();
    if (showGrid) {
      const minor = scale / 10;
      if (minor >= 5) {
        for (let x = ox % minor; x < width; x += minor) this.grid.moveTo(x, 0).lineTo(x, height);
        for (let y = oy % minor; y < height; y += minor) this.grid.moveTo(0, y).lineTo(width, y);
        this.grid.stroke({ color: '#243640', width: 1, alpha: 0.45 });
      }
      for (let x = ox % scale; x < width; x += scale) this.grid.moveTo(x, 0).lineTo(x, height);
      for (let y = oy % scale; y < height; y += scale) this.grid.moveTo(0, y).lineTo(width, y);
      this.grid.stroke({ color: '#344a56', width: 1, alpha: 0.65 });
    }
    this.grid.moveTo(0, oy).lineTo(width, oy).moveTo(ox, 0).lineTo(ox, height).stroke({ color: '#637d8b', width: 1, alpha: 0.55 });
    this.bodies.clear();
    for (const body of document.bodies) {
      const current = state[body.id]; if (!current) continue;
      const position = worldToScreen(current.position, this.view);
      for (const fixture of body.fixtures) {
        const shape = fixture.shape;
        if (shape.type === 'circle') this.bodies.circle(position.x, position.y, shape.radius * scale);
        else {
          const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => {
            const dx = x * shape.width / 2, dy = y * shape.height / 2;
            return worldToScreen({ x: current.position.x + dx * Math.cos(current.angle) - dy * Math.sin(current.angle), y: current.position.y + dx * Math.sin(current.angle) + dy * Math.cos(current.angle) }, this.view);
          });
          this.bodies.poly(corners.flatMap(p => [p.x, p.y]));
        }
        this.bodies.fill({ color: body.appearance.fill, alpha: body.appearance.opacity }).stroke({ color: body.id === selected ? '#d5f0ff' : body.appearance.stroke, width: body.id === selected ? 3 : body.appearance.strokeWidth });
        if (shape.type === 'circle') {
          this.bodies.circle(position.x - shape.radius * scale * 0.3, position.y - shape.radius * scale * 0.35, shape.radius * scale * 0.26).fill({ color: '#ffffff', alpha: 0.22 });
        }
      }
    }
    this.app.render();
  }
  destroy(): void { this.observer?.disconnect(); if (this.ready) this.app.destroy(true, { children: true }); }
}
