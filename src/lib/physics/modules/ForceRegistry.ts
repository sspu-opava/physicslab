import type { BodyDefinition, ForceDefinition, SceneState, Vector2 } from '../../document/types';
import type { PhysicsEngineAdapter } from '../PhysicsEngineAdapter';
import type { InternalPluginDefinition, PluginParameterDefinition } from '../../plugins/types';

export interface ForcePlugin extends InternalPluginDefinition { parameters: readonly PluginParameterDefinition[]; once?: boolean; create: (id: string, targets: string[]) => ForceDefinition; validate: (force: ForceDefinition, bodies: readonly BodyDefinition[]) => void; apply: (force: ForceDefinition, bodies: readonly BodyDefinition[], states: SceneState, engine: PhysicsEngineAdapter) => void }
const finite = (p: Record<string, unknown>, key: string, min = -Infinity): number => {
  const value = p[key]; if (typeof value !== 'number' || !Number.isFinite(value) || value < min) throw new Error(`Parametr ${key} musí být číslo ≥ ${min}.`); return value;
};
const vector = (p: Record<string, unknown>, key: string): Vector2 => ({ x: finite(p, `${key}X`), y: finite(p, `${key}Y`) });
const targetBodies = (force: ForceDefinition, bodies: readonly BodyDefinition[], exact?: number): BodyDefinition[] => {
  if (force.targetBodyIds.length < 1 || (exact !== undefined && force.targetBodyIds.length !== exact) || new Set(force.targetBodyIds).size !== force.targetBodyIds.length) throw new Error(exact === 2 ? 'Pružina vyžaduje dvě různá tělesa.' : 'Vyberte alespoň jedno těleso síly.');
  const result = force.targetBodyIds.map(id => bodies.find(body => body.id === id));
  if (result.some(body => !body)) throw new Error('Síla odkazuje na neexistující těleso.');
  if (!result.some(body => body!.type === 'dynamic')) throw new Error('Síla vyžaduje alespoň jedno dynamické těleso.');
  return result as BodyDefinition[];
};
const plugin = (type: string): ForcePlugin | undefined => forceRegistry.find(item => item.type === type);
export const forceRegistry: readonly ForcePlugin[] = [
  { type: 'impulse', label: 'Jednorázový impuls', targetMode: 'single', description: 'Applied once on the first step after reset.', parameters: [{key:'impulseX',label:'Impulse x',unit:'N s',defaultValue:0,step:0.1},{key:'impulseY',label:'Impulse y',unit:'N s',defaultValue:5,step:0.1}], once: true, create: (id,targets)=>({id,name:'Jednorázový impuls',type:'impulse',enabled:true,targetBodyIds:targets,parameters:{impulseX:0,impulseY:5}}),
    validate:(f,b)=>{targetBodies(f,b);vector(f.parameters,'impulse')},
    apply:(f,_b,states,engine)=>{const j=vector(f.parameters,'impulse');for(const id of f.targetBodyIds)if(states[id]?.mass!==0)engine.applyImpulse(id,j)}},
  { type: 'constant', label: 'Konstantní síla', targetMode: 'single', description: 'Applies to the target body throughout the simulation.', parameters: [{key:'forceX',label:'Force x',unit:'N',defaultValue:0,step:0.1},{key:'forceY',label:'Force y',unit:'N',defaultValue:10,step:0.1}], create: (id, targets) => ({ id, name: 'Konstantní síla', type: 'constant', enabled: true, targetBodyIds: targets, parameters: { forceX: 0, forceY: 10 } }),
    validate: (f,b) => { targetBodies(f,b); vector(f.parameters,'force'); },
    apply: (f,_b,states,engine) => { const v=vector(f.parameters,'force'); for(const id of f.targetBodyIds) if(states[id]?.mass!==0) engine.applyForce(id,v); } },
  { type: 'drag', label: 'Lineární odpor', targetMode: 'single', description: 'Resistance is proportional to body velocity.', parameters: [{key:'coefficient',label:'Drag coefficient',unit:'kg/s',defaultValue:0.2,min:0,step:0.01}], create: (id, targets) => ({ id, name: 'Lineární odpor', type: 'drag', enabled: true, targetBodyIds: targets, parameters: { coefficient: 0.2 } }),
    validate: (f,b) => { targetBodies(f,b); finite(f.parameters,'coefficient',0); },
    apply: (f,_b,states,engine) => { const k=finite(f.parameters,'coefficient',0); for(const id of f.targetBodyIds) { const v=states[id]?.velocity; if(v && states[id].mass!==0) engine.applyForce(id,{x:-k*v.x,y:-k*v.y}); } } },
  { type: 'spring', label: 'Pružina', targetMode: 'pair', description: 'Acts between two bodies according to Hooke law.', parameters: [{key:'restLength',label:'Rest length',unit:'m',defaultValue:2,min:0.01,step:0.1},{key:'stiffness',label:'Stiffness',unit:'N/m',defaultValue:10,min:0,step:0.5},{key:'damping',label:'Damping',unit:'N s/m',defaultValue:0.1,min:0,step:0.05}], create: (id, targets) => ({ id, name: 'Pružina', type: 'spring', enabled: true, targetBodyIds: targets, parameters: { restLength: 2, stiffness: 10, damping: 0.1 } }),
    validate: (f,b) => { targetBodies(f,b,2); finite(f.parameters,'restLength',0.01); finite(f.parameters,'stiffness',0); finite(f.parameters,'damping',0); },
    apply: (f,_b,states,engine) => {
      const [a,b]=f.targetBodyIds.map(id=>states[id]); if(!a||!b) return;
      const dx=b.position.x-a.position.x, dy=b.position.y-a.position.y, distance=Math.hypot(dx,dy); if(distance<1e-9) return;
      const nx=dx/distance, ny=dy/distance, relative=(b.velocity.x-a.velocity.x)*nx+(b.velocity.y-a.velocity.y)*ny;
      const magnitude=finite(f.parameters,'stiffness',0)*(distance-finite(f.parameters,'restLength',0.01))+finite(f.parameters,'damping',0)*relative;
      const value={x:nx*magnitude,y:ny*magnitude}; if(a.mass!==0)engine.applyForce(f.targetBodyIds[0],value); if(b.mass!==0)engine.applyForce(f.targetBodyIds[1],{x:-value.x,y:-value.y});
    } }
];
export function validateForce(force: ForceDefinition, bodies: readonly BodyDefinition[]): void { const item=plugin(force.type); if(!item) throw new Error(`Neznámý typ síly: ${force.type}`); item.validate(force,bodies); }
export function applyForces(forces: readonly ForceDefinition[], bodies: readonly BodyDefinition[], states: SceneState, engine: PhysicsEngineAdapter, once=false, onError?: (message: string) => void): void {
  for(const force of forces) if(force.enabled) { const item=plugin(force.type); if(item&&!!item.once===once) try { item.apply(force,bodies,states,engine); } catch(error) { onError?.(`Síla ${force.name ?? force.type}: ${error instanceof Error ? error.message : String(error)}`); } }
}
