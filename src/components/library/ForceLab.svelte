<script lang="ts">
  import type { PhysicsDocument, ForceDefinition, FieldDefinition } from '../../lib/document/types';
  import { forceRegistry, type ForcePlugin } from '../../lib/physics/modules/ForceRegistry';
  import { fieldRegistry, type FieldPlugin } from '../../lib/physics/modules/FieldRegistry';
  import { defaultPluginParameters, type PluginParameterDefinition } from '../../lib/plugins/types';

  let { document, selection, disabled, addForce, updateForce, removeForce, addField, updateField, removeField }: {
    document: PhysicsDocument; selection: string[]; disabled: boolean;
    addForce: (force: ForceDefinition) => void; updateForce: (force: ForceDefinition) => boolean; removeForce: (id: string) => void;
    addField: (field: FieldDefinition) => void; updateField: (field: FieldDefinition) => boolean; removeField: (id: string) => void;
  } = $props();

  let kind = $state('constant');
  let targetA = $state(''), targetB = $state('');
  let forceParameters = $state(defaultPluginParameters(forceRegistry.find(plugin => plugin.type === 'constant')!.parameters));
  let fieldKind = $state(fieldRegistry[0].type);
  let fieldParameters = $state(defaultPluginParameters(fieldRegistry[0].parameters));
  let revision = $state(0);
  let dynamicBodies = $derived(document.bodies.filter(body => body.type === 'dynamic'));
  let firstTarget = $derived(dynamicBodies.find(body => body.id === targetA)?.id ?? dynamicBodies.find(body => selection.includes(body.id))?.id ?? dynamicBodies[0]?.id ?? '');
  let secondTarget = $derived(dynamicBodies.find(body => body.id === targetB && body.id !== firstTarget)?.id ?? dynamicBodies.find(body => body.id !== firstTarget)?.id ?? '');
  let activeForce: ForcePlugin = $derived(forceRegistry.find(plugin => plugin.type === kind) ?? forceRegistry[0]);
  let activeField: FieldPlugin = $derived(fieldRegistry.find(plugin => plugin.type === fieldKind) ?? fieldRegistry[0]);

  function selectForce(type: string) {
    const plugin = forceRegistry.find(item => item.type === type); if (!plugin) return;
    kind = type; forceParameters = defaultPluginParameters(plugin.parameters);
  }
  function selectField(type: string) {
    const plugin = fieldRegistry.find(item => item.type === type); if (!plugin) return;
    fieldKind = type; fieldParameters = defaultPluginParameters(plugin.parameters);
  }
  function setValue(values: Record<string, number>, key: string, value: number, setter: (next: Record<string, number>) => void) {
    if (Number.isFinite(value)) setter({ ...values, [key]: value });
  }
  function createForce(event: SubmitEvent) {
    event.preventDefault();
    if (!firstTarget || (activeForce.targetMode === 'pair' && !secondTarget)) return;
    const targets = activeForce.targetMode === 'pair' ? [firstTarget, secondTarget] : [firstTarget];
    addForce({ ...activeForce.create(crypto.randomUUID(), targets), parameters: { ...forceParameters } });
  }
  function createField() {
    addField({ ...activeField.create(crypto.randomUUID()), parameters: { ...fieldParameters } });
  }
  function parameterTitle(definitions: readonly PluginParameterDefinition[], key: string): string {
    const parameter = definitions.find(item => item.key === key);
    return parameter ? `${parameter.label}${parameter.unit ? ` [${parameter.unit}]` : ''}` : key;
  }
  function changeForce(force: ForceDefinition) { if (!updateForce(force)) revision++; }
  function changeField(field: FieldDefinition) { if (!updateField(field)) revision++; }
</script>

<section class="force-lab">
  <h3>Síly</h3>
  <form class="force-form" onsubmit={createForce}>
    <label>Typ<select disabled={disabled} value={kind} onchange={event => selectForce(event.currentTarget.value)}>{#each forceRegistry as plugin}<option value={plugin.type}>{plugin.label}</option>{/each}</select></label>
    <label>Těleso A<select disabled={disabled} value={firstTarget} onchange={event => targetA = event.currentTarget.value}>{#each dynamicBodies as body}<option value={body.id}>{body.name}</option>{/each}</select></label>
    {#if activeForce.targetMode === 'pair'}<label>Těleso B<select disabled={disabled} value={secondTarget} onchange={event => targetB = event.currentTarget.value}>{#each dynamicBodies.filter(body => body.id !== firstTarget) as body}<option value={body.id}>{body.name}</option>{/each}</select></label>{/if}
    <div class="module-numbers">
      {#each activeForce.parameters as parameter (parameter.key)}
        <label>{parameterTitle(activeForce.parameters, parameter.key)}<input type="number" min={parameter.min} max={parameter.max} step={parameter.step ?? 'any'} disabled={disabled} value={forceParameters[parameter.key]} onchange={event => setValue(forceParameters, parameter.key, event.currentTarget.valueAsNumber, next => forceParameters = next)}/></label>
      {/each}
    </div>
    <button type="submit" disabled={disabled || !firstTarget || (activeForce.targetMode === 'pair' && !secondTarget)}>+ Přidat sílu</button>
  </form>

  {#key revision}
    {#each document.forces as force (force.id)}
      {@const plugin = forceRegistry.find(item => item.type === force.type)}
      <div class="force-card">
        <div class="module-row"><label><input type="checkbox" checked={force.enabled} disabled={disabled} onchange={event => changeForce({ ...force, enabled: event.currentTarget.checked })}/>{force.name ?? plugin?.label ?? force.type}</label><small>{force.targetBodyIds.map(id => document.bodies.find(body => body.id === id)?.name ?? '').join(' · ')}</small><button disabled={disabled} aria-label={`Smazat ${force.name ?? force.type}`} onclick={() => removeForce(force.id)}>×</button></div>
        <div class="field-parameters">{#each Object.entries(force.parameters).filter((entry): entry is [string, number] => typeof entry[1] === 'number') as [key, value] (key)}<label>{parameterTitle(plugin?.parameters ?? [], key)}<input type="number" step="any" value={value} disabled={disabled} onchange={event => changeForce({ ...force, parameters: { ...force.parameters, [key]: event.currentTarget.valueAsNumber } })}/></label>{/each}</div>
      </div>
    {/each}
    <h3>Pole</h3>
    <div class="field-create">
      <label>Typ<select disabled={disabled} value={fieldKind} onchange={event => selectField(event.currentTarget.value)}>{#each fieldRegistry as plugin}<option value={plugin.type}>{plugin.label}</option>{/each}</select></label>
      {#each activeField.parameters as parameter (parameter.key)}<label>{parameterTitle(activeField.parameters, parameter.key)}<input type="number" min={parameter.min} max={parameter.max} step={parameter.step ?? 'any'} disabled={disabled} value={fieldParameters[parameter.key]} onchange={event => setValue(fieldParameters, parameter.key, event.currentTarget.valueAsNumber, next => fieldParameters = next)}/></label>{/each}
      <button disabled={disabled} onclick={createField}>+ Přidat pole</button>
    </div>
    {#each document.fields as field (field.id)}
      {@const plugin = fieldRegistry.find(item => item.type === field.type)}
      <div class="field-card"><div class="module-row"><label><input type="checkbox" checked={field.enabled} disabled={disabled} onchange={event => changeField({ ...field, enabled: event.currentTarget.checked })}/>{field.name ?? plugin?.label ?? field.type}</label><button disabled={disabled} aria-label={`Smazat ${field.name ?? field.type}`} onclick={() => removeField(field.id)}>×</button></div>
        <div class="field-parameters">{#each Object.entries(field.parameters).filter((entry): entry is [string, number] => typeof entry[1] === 'number') as [key, value] (key)}<label>{parameterTitle(plugin?.parameters ?? [], key)}<input type="number" step="any" value={value} disabled={disabled} onchange={event => changeField({ ...field, parameters: { ...field.parameters, [key]: event.currentTarget.valueAsNumber } })}/></label>{/each}</div>
      </div>
    {/each}
  {/key}
  <p class="force-help">Modul sil, polí a senzorů jsou definovány v interních registrech. Jejich popis a číselné parametry řídí společná metadata pluginů.</p>
</section>
