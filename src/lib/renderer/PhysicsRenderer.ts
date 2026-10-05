import { Application, Graphics } from 'pixi.js';
import type { PhysicsDocument, SceneState, Vector2 } from '../document/types';
import { screenToWorld, worldToScreen, type Viewport } from '../units/coordinates';
import { bodyBounds, type SelectionBox } from '../tools/SceneTools';
import { jointAnchors, localToWorld } from '../physics/joints/joints';
export class PhysicsRenderer {
  private app = new Application();
  private grid = new Graphics();
  private bodies = new Graphics();
  private overlay = new Graphics();
  private joints = new Graphics();
  private trails = new Graphics();
  private vectors = new Graphics();
  private trailData=new Map<string,{points:Vector2[];last:number}>();
  private lastRenderTime=0;
  private observer?: ResizeObserver;
  private ready = false;
  view: Viewport = { origin: { x: 0, y: 0 }, pixelsPerMeter: 100, zoom: 1 };
  async initialize(host: HTMLDivElement): Promise<void> {
    await this.app.init({ backgroundAlpha: 0, antialias: true, resolution: window.devicePixelRatio, autoDensity: true, preference: 'webgl', autoStart: false, width: host.clientWidth, height: host.clientHeight });
    host.appendChild(this.app.canvas); this.app.stage.addChild(this.grid, this.trails, this.joints, this.bodies, this.vectors, this.overlay); this.ready = true;
    this.resetView();
    this.observer = new ResizeObserver(() => {
      const previous = { width: this.app.screen.width, height: this.app.screen.height };
      this.app.renderer.resize(host.clientWidth, host.clientHeight);
      this.pan({ x: (host.clientWidth - previous.width) / 2, y: (host.clientHeight - previous.height) * 0.83 });
    });
    this.observer.observe(host);
  }
  resetView(): void {
    this.view.origin = { x: this.app.screen.width / 2, y: this.app.screen.height * 0.83 };
    this.view.zoom = Math.max(0.2, Math.min(1, (this.app.screen.height * 0.83 - 55) / (4.3 * this.view.pixelsPerMeter), (this.app.screen.width - 60) / (10 * this.view.pixelsPerMeter)));
  }
  pan(delta: Vector2): void { this.view.origin.x += delta.x; this.view.origin.y += delta.y; }
  fitToScene(document: PhysicsDocument, state: SceneState): void {
    const bounds = document.bodies.filter(body => state[body.id]).map(body => bodyBounds(body, state[body.id]));
    if (!bounds.length) { this.resetView(); return; }
    const minX = Math.min(...bounds.map(b => b.minX)), maxX = Math.max(...bounds.map(b => b.maxX));
    const minY = Math.min(...bounds.map(b => b.minY)), maxY = Math.max(...bounds.map(b => b.maxY));
    this.view.pixelsPerMeter = document.world.pixelsPerMeter;
    this.view.zoom = Math.max(0.05, Math.min(4, (this.app.screen.width - 100) / (Math.max(0.1, maxX - minX) * this.view.pixelsPerMeter), (this.app.screen.height - 100) / (Math.max(0.1, maxY - minY) * this.view.pixelsPerMeter)));
    const scale = this.view.zoom * this.view.pixelsPerMeter;
    this.view.origin = { x: this.app.screen.width / 2 - (minX + maxX) / 2 * scale, y: this.app.screen.height / 2 + (minY + maxY) / 2 * scale };
  }
  zoomAt(point: Vector2, factor: number): void {
    const world = screenToWorld(point, this.view); this.view.zoom = Math.max(0.05, Math.min(4, this.view.zoom * factor));
    const next = worldToScreen(world, this.view); this.pan({ x: point.x - next.x, y: point.y - next.y });
  }
  render(document: PhysicsDocument, state: SceneState, selection: string[], showGrid: boolean, box?: SelectionBox, options:VisualizationOptions=defaultVisualization, time=0, contacts:Vector2[]=[]): void {
    if (!this.ready) return;
    this.view.pixelsPerMeter = document.world.pixelsPerMeter;
    const { width, height } = this.app.screen, scale = this.view.pixelsPerMeter * this.view.zoom;
    const { x: ox, y: oy } = this.view.origin;
    const vectorScale=Number.isFinite(options.vectorScale)?Math.max(0.05,Math.min(0.8,options.vectorScale)):defaultVisualization.vectorScale;
    const maxTrailPoints=Number.isFinite(options.trajectory.maxPoints)?Math.max(2,Math.min(5000,Math.floor(options.trajectory.maxPoints))):defaultVisualization.trajectory.maxPoints;
    const trailInterval=Number.isFinite(options.trajectory.sampleInterval)?Math.max(0.01,Math.min(2,options.trajectory.sampleInterval)):defaultVisualization.trajectory.sampleInterval;
    const trailWidth=Number.isFinite(options.trajectory.lineWidth)?Math.max(1,Math.min(8,options.trajectory.lineWidth)):defaultVisualization.trajectory.lineWidth;
    if(time+1e-8<this.lastRenderTime){this.trailData.clear();this.nextTrailSample=0}
    if(!options.trajectory.enabled){this.trailData.clear();this.nextTrailSample=0}
    this.lastRenderTime=time;
    if(options.trajectory.enabled&&time+1e-8>=this.nextTrailSample){
      for(const body of document.bodies){const point=state[body.id]?.position;if(!point)continue;const trail=this.trailData.get(body.id)??{points:[],last:time};trail.points.push({...point});trail.last=time;while(trail.points.length>maxTrailPoints)trail.points.shift();this.trailData.set(body.id,trail)}
      this.nextTrailSample+=trailInterval;
      while(this.nextTrailSample<=time+1e-8)this.nextTrailSample+=trailInterval;
    }
    this.trails.clear();
    if(options.trajectory.enabled)for(const body of document.bodies){const trail=this.trailData.get(body.id);if(!trail||trail.points.length<2)continue;for(let i=1;i<trail.points.length;i++){const a=worldToScreen(trail.points[i-1],this.view),b=worldToScreen(trail.points[i],this.view);this.trails.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({color:body.appearance.fill,width:trailWidth,alpha:options.trajectory.fade?0.12+0.72*i/(trail.points.length-1):0.8})}}
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
    this.vectors.clear();
    if(options.centerOfMass)for(const body of document.bodies){const center=state[body.id]?.centerOfMass??state[body.id]?.position;if(!center)continue;const p=worldToScreen(center,this.view);this.vectors.circle(p.x,p.y,4).fill('#ffdc7a').stroke({color:'#1a2630',width:1})}
    for(const body of document.bodies){const current=state[body.id];if(!current||body.type!=='dynamic')continue;const start=worldToScreen(current.position,this.view);if(options.velocity)this.drawArrow(this.vectors,start,current.velocity,vectorScale*scale,'#55d7ff');if(options.acceleration&&current.acceleration)this.drawArrow(this.vectors,start,current.acceleration,vectorScale*vectorScale*scale,'#ff8e69')}
    if(options.gravity){for(const body of document.bodies.filter(body=>body.type==='dynamic')){const p=worldToScreen(state[body.id]?.position??body.position,this.view);this.drawArrow(this.vectors,p,document.world.gravity,vectorScale*vectorScale*scale,'#b995ff')}}
    if(options.contacts)for(const point of contacts){const p=worldToScreen(point,this.view);this.vectors.circle(p.x,p.y,4).fill('#ff5e70').stroke({color:'#fff0f1',width:1})}
    this.joints.clear();
    for (const joint of document.joints) {
      const anchors = jointAnchors(joint, state); if (!anchors) continue;
      const a = worldToScreen(anchors.a, this.view), b = worldToScreen(anchors.b, this.view);
      const color = selection.includes(joint.id) ? '#fff1a3' : joint.enabled ? '#f7c879' : '#6b7e8b';
      if (joint.type !== 'distance') {
        const centerA = worldToScreen(state[joint.bodyAId].position, this.view), centerB = worldToScreen(state[joint.bodyBId].position, this.view);
        this.joints.moveTo(centerA.x, centerA.y).lineTo(a.x, a.y).moveTo(b.x, b.y).lineTo(centerB.x, centerB.y).stroke({ color, width: 3, alpha: joint.enabled ? 0.7 : 0.3 });
      }
      this.joints.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color, width: selection.includes(joint.id) ? 4 : 2, alpha: joint.enabled ? 1 : 0.4 });
      this.joints.circle(a.x, a.y, 6).fill('#172733').stroke({ color, width: 2 });
      this.joints.circle(b.x, b.y, 5).fill('#172733').stroke({ color, width: 2 });
      if (joint.type === 'weld') this.joints.rect(a.x - 4, a.y - 4, 8, 8).stroke({ color, width: 2 });
      if (joint.type === 'prismatic') {
        const body = state[joint.bodyAId], length = Math.hypot(joint.localAxisA.x, joint.localAxisA.y);
        const axisEnd = localToWorld({ x: joint.localAnchorA.x + joint.localAxisA.x / length, y: joint.localAnchorA.y + joint.localAxisA.y / length }, body);
        const end = worldToScreen(axisEnd, this.view);
        this.joints.moveTo(a.x, a.y).lineTo(end.x, end.y).stroke({ color: '#7fdbb6', width: 2, alpha: 0.8 });
      }
    }
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
        this.bodies.fill({ color: body.appearance.fill, alpha: body.appearance.opacity }).stroke({ color: selection.includes(body.id) ? '#d5f0ff' : body.appearance.stroke, width: selection.includes(body.id) ? 3 : body.appearance.strokeWidth });
        if (shape.type === 'circle') {
          this.bodies.circle(position.x - shape.radius * scale * 0.3, position.y - shape.radius * scale * 0.35, shape.radius * scale * 0.26).fill({ color: '#ffffff', alpha: 0.22 });
        }
      }
    }
    this.overlay.clear();
    for (const body of document.bodies.filter(body => selection.includes(body.id))) {
      const current = state[body.id]; if (!current) continue;
      const bounds = bodyBounds(body, current);
      const topLeft = worldToScreen({ x: bounds.minX, y: bounds.maxY }, this.view);
      const bottomRight = worldToScreen({ x: bounds.maxX, y: bounds.minY }, this.view);
      this.overlay.rect(topLeft.x - 5, topLeft.y - 5, bottomRight.x - topLeft.x + 10, bottomRight.y - topLeft.y + 10).stroke({ color: '#55baff', alpha: 0.65, width: 1 });
      const center = worldToScreen(current.position, this.view);
      this.overlay.moveTo(center.x - 4, center.y).lineTo(center.x + 4, center.y).moveTo(center.x, center.y - 4).lineTo(center.x, center.y + 4).stroke({ color: '#e2f5ff', alpha: 0.8, width: 1 });
    }
    if (box) {
      const a = worldToScreen(box.start, this.view), b = worldToScreen(box.end, this.view);
      this.overlay.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(a.x - b.x), Math.abs(a.y - b.y)).fill({ color: '#42a8f8', alpha: 0.12 }).stroke({ color: '#64c2ff', width: 1 });
    }
    this.app.render();
  }
  private nextTrailSample=0;
  private drawArrow(graphics:Graphics,start:Vector2,value:Vector2,factor:number,color:string):void{
    const length=Math.hypot(value.x,value.y);if(length<1e-8)return;const scale=Math.min(5,factor*length),end={x:start.x+value.x/length*scale,y:start.y-value.y/length*scale};
    const angle=Math.atan2(end.y-start.y,end.x-start.x),head=7;
    graphics.moveTo(start.x,start.y).lineTo(end.x,end.y).stroke({color,width:2.5,alpha:0.9});
    graphics.moveTo(end.x,end.y).lineTo(end.x-head*Math.cos(angle-0.48),end.y-head*Math.sin(angle-0.48)).lineTo(end.x-head*Math.cos(angle+0.48),end.y-head*Math.sin(angle+0.48)).closePath().fill(color);
  }
  clearTrails():void{this.trailData.clear();this.nextTrailSample=0}
  destroy(): void { this.observer?.disconnect(); if (this.ready) this.app.destroy(true, { children: true }); }
}

export interface VisualizationOptions {
  velocity:boolean;acceleration:boolean;gravity:boolean;centerOfMass:boolean;contacts:boolean;vectorScale:number;
  trajectory:{enabled:boolean;maxPoints:number;sampleInterval:number;lineWidth:number;fade:boolean};
}
export const defaultVisualization:VisualizationOptions={velocity:true,acceleration:false,gravity:false,centerOfMass:false,contacts:false,vectorScale:0.25,trajectory:{enabled:false,maxPoints:300,sampleInterval:0.05,lineWidth:2,fade:true}};
