import type { BodyDefinition, FieldDefinition, SceneState, Vector2 } from '../../document/types';
import type { PhysicsEngineAdapter } from '../PhysicsEngineAdapter';

export interface FieldPlugin { type: string; label: string; create: (id: string) => FieldDefinition; validate: (field: FieldDefinition) => void; apply: (field: FieldDefinition, bodies: readonly BodyDefinition[], states: SceneState, engine: PhysicsEngineAdapter) => void }
function number(parameters: Record<string,unknown>, key:string, min= -Infinity):number { const value=parameters[key]; if(typeof value!=='number'||!Number.isFinite(value)||value<min)throw new Error(`Parametr ${key} musí být číslo ≥ ${min}.`); return value; }
function vector(parameters:Record<string,unknown>,key:string):Vector2{return{x:number(parameters,`${key}X`),y:number(parameters,`${key}Y`)}}
export const fieldRegistry: readonly FieldPlugin[] = [
  {type:'gravity',label:'Přídavná gravitace',create:id=>({id,name:'Přídavná gravitace',type:'gravity',enabled:true,parameters:{accelerationX:0,accelerationY:-9.81}}),
    validate:f=>{vector(f.parameters,'acceleration')},
    apply:(f,bodies,_states,engine)=>{const g=vector(f.parameters,'acceleration'); for(const body of bodies)if(body.type==='dynamic')engine.applyForce(body.id,{x:body.mass*g.x,y:body.mass*g.y});}},
  {type:'wind',label:'Vítr',create:id=>({id,name:'Vítr',type:'wind',enabled:true,parameters:{velocityX:5,velocityY:0,coefficient:0.5}}),
    validate:f=>{vector(f.parameters,'velocity');number(f.parameters,'coefficient',0)},
    apply:(f,bodies,states,engine)=>{const wind=vector(f.parameters,'velocity'),k=number(f.parameters,'coefficient',0);for(const body of bodies)if(body.type==='dynamic'){const v=states[body.id]?.velocity;if(v)engine.applyForce(body.id,{x:k*(wind.x-v.x),y:k*(wind.y-v.y)});}}}
];
export function validateField(field:FieldDefinition):void{const item=fieldRegistry.find(p=>p.type===field.type);if(!item)throw new Error(`Neznámý typ pole: ${field.type}`);item.validate(field)}
export function applyFields(fields:readonly FieldDefinition[],bodies:readonly BodyDefinition[],states:SceneState,engine:PhysicsEngineAdapter):void{for(const field of fields)if(field.enabled){const item=fieldRegistry.find(p=>p.type===field.type);if(item)item.apply(field,bodies,states,engine)}}
