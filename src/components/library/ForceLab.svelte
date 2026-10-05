<script lang="ts">
  import type { PhysicsDocument, ForceDefinition, FieldDefinition } from '../../lib/document/types';
  import { forceRegistry } from '../../lib/physics/modules/ForceRegistry';
  import { fieldRegistry } from '../../lib/physics/modules/FieldRegistry';
  let { document, selection, disabled, addForce, updateForce, removeForce, addField, updateField, removeField }: {
    document:PhysicsDocument;selection:string[];disabled:boolean;addForce:(f:ForceDefinition)=>void;updateForce:(f:ForceDefinition)=>boolean;removeForce:(id:string)=>void;
    addField:(f:FieldDefinition)=>void;updateField:(f:FieldDefinition)=>boolean;removeField:(id:string)=>void
  } = $props();
  let kind=$state('constant'), targetA=$state(''),targetB=$state(''), fx=$state(0),fy=$state(10),coefficient=$state(0.2),restLength=$state(2),stiffness=$state(10),damping=$state(0.1),gx=$state(0),gy=$state(0),windX=$state(5),windY=$state(0),windCoefficient=$state(0.5),revision=$state(0);
  let dynamicBodies=$derived(document.bodies.filter(b=>b.type==='dynamic'));
  let firstTarget=$derived(dynamicBodies.find(b=>b.id===targetA)?.id??dynamicBodies.find(b=>selection.includes(b.id))?.id??dynamicBodies[0]?.id??'');
  let secondTarget=$derived(dynamicBodies.find(b=>b.id===targetB&&b.id!==firstTarget)?.id??dynamicBodies.find(b=>b.id!==firstTarget)?.id??'');
  function createForce(event:SubmitEvent){event.preventDefault();const plugin=forceRegistry.find(p=>p.type===kind);if(!plugin)return;
    const params=kind==='constant'?{forceX:fx,forceY:fy}:kind==='impulse'?{impulseX:fx,impulseY:fy}:kind==='drag'?{coefficient}:{restLength,stiffness,damping};
    const force={...plugin.create(crypto.randomUUID(),kind==='spring'?[firstTarget,secondTarget]:[firstTarget]),parameters:params};addForce(force);
  }
  function fieldParameters(type:string){return type==='gravity'?{accelerationX:gx,accelerationY:gy}:{velocityX:windX,velocityY:windY,coefficient:windCoefficient}}
  function createField(type:string){const plugin=fieldRegistry.find(p=>p.type===type);if(plugin)addField({...plugin.create(crypto.randomUUID()),parameters:fieldParameters(type)})}
  function parameters(module:FieldDefinition){return Object.entries(module.parameters).filter((entry):entry is [string,number]=>typeof entry[1]==='number')}
  function forceParameters(force:ForceDefinition){return Object.entries(force.parameters).filter((entry):entry is [string,number]=>typeof entry[1]==='number')}
  function changeForce(force:ForceDefinition){if(!updateForce(force))revision++}
  function changeField(field:FieldDefinition){if(!updateField(field))revision++}
</script>
<section class="force-lab">
  <h3>Síly</h3>
  <form class="force-form" onsubmit={createForce}>
    <label>Typ<select disabled={disabled} bind:value={kind}>{#each forceRegistry as force}<option value={force.type}>{force.label}</option>{/each}</select></label>
    <label>Těleso A<select disabled={disabled} value={firstTarget} onchange={e=>targetA=e.currentTarget.value}>{#each dynamicBodies as body}<option value={body.id}>{body.name}</option>{/each}</select></label>
    {#if kind==='spring'}<label>Těleso B<select disabled={disabled} value={secondTarget} onchange={e=>targetB=e.currentTarget.value}>{#each dynamicBodies.filter(b=>b.id!==firstTarget) as body}<option value={body.id}>{body.name}</option>{/each}</select></label><div class="module-numbers"><label>Klidová délka [m]<input type="number" min="0.01" step="any" disabled={disabled} bind:value={restLength}/></label><label>Tuhost [N/m]<input type="number" min="0" step="any" disabled={disabled} bind:value={stiffness}/></label><label>Tlumení [N·s/m]<input type="number" min="0" step="any" disabled={disabled} bind:value={damping}/></label></div>
    {:else if kind==='constant'||kind==='impulse'}<div class="module-numbers"><label>{kind==='impulse'?'Jx [N·s]':'Fx [N]'}<input type="number" step="any" disabled={disabled} bind:value={fx}/></label><label>{kind==='impulse'?'Jy [N·s]':'Fy [N]'}<input type="number" step="any" disabled={disabled} bind:value={fy}/></label></div>
    {:else}<label>Koeficient [kg/s]<input type="number" min="0" step="any" disabled={disabled} bind:value={coefficient}/></label>{/if}
    <button type="submit" disabled={disabled||!firstTarget||(kind==='spring'&&!secondTarget)}>+ Přidat sílu</button>
  </form>
  {#key revision}{#each document.forces as force (force.id)}<div class="force-card"><div class="module-row"><label><input type="checkbox" checked={force.enabled} disabled={disabled} onchange={e=>changeForce({...force,enabled:e.currentTarget.checked})}/>{force.name??force.type}</label><small>{force.targetBodyIds.map(id=>document.bodies.find(b=>b.id===id)?.name??'').join(' · ')}</small><button disabled={disabled} aria-label={`Smazat ${force.name??force.type}`} onclick={()=>removeForce(force.id)}>×</button></div><div class="field-parameters">{#each forceParameters(force) as [key,value]}<label>{key}<input type="number" step="any" value={value} disabled={disabled} onchange={e=>changeForce({...force,parameters:{...force.parameters,[key]:e.currentTarget.valueAsNumber}})}/></label>{/each}</div></div>{/each}
  <h3>Pole</h3>
  <div class="field-create"><label>gx [m/s²]<input type="number" step="any" disabled={disabled} bind:value={gx}/></label><label>gy [m/s²]<input type="number" step="any" disabled={disabled} bind:value={gy}/></label><button disabled={disabled} onclick={()=>createField('gravity')}>+ Gravitace</button></div>
  <div class="field-create"><label>Rychlost x [m/s]<input type="number" step="any" disabled={disabled} bind:value={windX}/></label><label>Rychlost y [m/s]<input type="number" step="any" disabled={disabled} bind:value={windY}/></label><label>Odpor [kg/s]<input type="number" min="0" step="any" disabled={disabled} bind:value={windCoefficient}/></label><button disabled={disabled} onclick={()=>createField('wind')}>+ Vítr</button></div>
  {#each document.fields as field (field.id)}<div class="field-card"><div class="module-row"><label><input type="checkbox" checked={field.enabled} disabled={disabled} onchange={e=>changeField({...field,enabled:e.currentTarget.checked})}/>{field.name??field.type}</label><button disabled={disabled} aria-label={`Smazat ${field.name??field.type}`} onclick={()=>removeField(field.id)}>×</button></div><div class="field-parameters">{#each parameters(field) as [key,value]}<label>{key}<input type="number" step="any" value={value} disabled={disabled} onchange={e=>changeField({...field,parameters:{...field.parameters,[key]:e.currentTarget.valueAsNumber}})}/></label>{/each}</div></div>{/each}{/key}
  <p class="force-help">Impuls se uplatní při prvním Kroku simulace a znovu až po resetu. Konstantní síla a pružina působí průběžně; lineární odpor závisí na rychlosti. Gravitace pole se přičítá ke gravitaci světa. Vítr působí jako odpor úměrný rozdílu rychlostí.</p>
</section>
