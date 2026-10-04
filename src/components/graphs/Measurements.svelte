<script lang="ts">
  import type { BodyState } from '../../lib/document/types';
  let { state, time, name }: { state?: BodyState; time: number; name: string } = $props();
</script>
<section class="panel measurements">
  <div class="panel-tabs"><span class="selected-tab">Aktuální hodnoty</span><span class="muted">{name}</span><span class="measurement-note">Živý odečet · SI</span></div>
  {#if state}<div class="metrics">{#each [{ label: 'Čas', value: time, unit: 's' }, { label: 'Poloha x', value: state.position.x, unit: 'm' }, { label: 'Poloha y', value: state.position.y, unit: 'm' }, { label: 'Rychlost vx', value: state.velocity.x, unit: 'm/s' }, { label: 'Rychlost vy', value: state.velocity.y, unit: 'm/s' }, { label: 'Rychlost |v|', value: Math.hypot(state.velocity.x, state.velocity.y), unit: 'm/s' }] as metric}<div class="metric"><span>{metric.label}</span><strong>{metric.value.toFixed(3)} <small>{metric.unit}</small></strong></div>{/each}</div>{:else}<p class="empty-state">Vyberte těleso pro zobrazení hodnot.</p>{/if}
  <div class="measurement-footer">Časové řady a grafy budou součástí etapy měření.</div>
</section>
