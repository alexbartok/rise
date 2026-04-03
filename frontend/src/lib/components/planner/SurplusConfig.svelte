<script>
  import { t } from '../../i18n/index.js';
  import { recipe, multiplier } from '../../stores/recipe.js';
  import { surplusConfig } from '../../stores/planner.js';
  import DatePicker from '../ui/DatePicker.svelte';
  import TimePicker from '../ui/TimePicker.svelte';

  $: baseYield = $recipe?.baseYield;
  $: totalAmount = baseYield ? Math.round(baseYield.amount * $multiplier) : 0;
  $: surplusOptions = $recipe?.surplus?.options || [];

  // Keep bakeNow + forLater in sync with total amount
  $: {
    if ($surplusConfig.bakeNow + $surplusConfig.forLater !== totalAmount) {
      $surplusConfig = {
        ...$surplusConfig,
        bakeNow: totalAmount,
        forLater: 0,
        enabled: false,
      };
    }
  }

  function setBakeNow(val) {
    const clamped = Math.max(0, Math.min(totalAmount, val));
    $surplusConfig = {
      ...$surplusConfig,
      bakeNow: clamped,
      forLater: totalAmount - clamped,
      enabled: totalAmount - clamped > 0,
    };
  }

  function setForLater(val) {
    const clamped = Math.max(0, Math.min(totalAmount, val));
    $surplusConfig = {
      ...$surplusConfig,
      forLater: clamped,
      bakeNow: totalAmount - clamped,
      enabled: clamped > 0,
    };
  }

  function toTimeString(date) {
    if (!date) return '12:00';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  // Default surplus target: tomorrow at 12:00
  function defaultSurplusDate() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(12, 0, 0, 0);
    return d;
  }

  $: surplusDate = $surplusConfig.targetTime || defaultSurplusDate();
  $: surplusTimeStr = toTimeString($surplusConfig.targetTime);

  function handleSurplusDateChange(newDate) {
    $surplusConfig = { ...$surplusConfig, targetTime: newDate };
  }

  function handleSurplusTimeChange(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const current = new Date($surplusConfig.targetTime || defaultSurplusDate());
    current.setHours(h, m, 0, 0);
    $surplusConfig = { ...$surplusConfig, targetTime: current };
  }

  function handleMethodChange(e) {
    $surplusConfig = {
      ...$surplusConfig,
      method: e.target.value || null,
    };
  }
</script>

<div class="surplus-config">
  <div class="surplus-row">
    <label class="surplus-label" for="surplus-bake-now">{$t('planner.surplus.now')}</label>
    <input
      id="surplus-bake-now"
      type="number"
      class="surplus-input"
      min="0"
      max={totalAmount}
      value={$surplusConfig.bakeNow}
      on:input={(e) => setBakeNow(Number(e.target.value))}
    />
  </div>

  <div class="surplus-row">
    <label class="surplus-label" for="surplus-for-later">{$t('planner.surplus.later')}</label>
    <input
      id="surplus-for-later"
      type="number"
      class="surplus-input"
      min="0"
      max={totalAmount}
      value={$surplusConfig.forLater}
      on:input={(e) => setForLater(Number(e.target.value))}
    />
  </div>

  {#if $surplusConfig.forLater > 0}
    {#if surplusOptions.length > 0}
      <div class="surplus-row">
        <label class="surplus-label" for="surplus-method">{$t('planner.surplus.method')}</label>
        <select id="surplus-method" class="surplus-select" value={$surplusConfig.method || ''} on:change={handleMethodChange}>
          <option value="">--</option>
          {#each surplusOptions as opt}
            <option value={opt.id}>{opt.name}</option>
          {/each}
        </select>
      </div>

      {#if $surplusConfig.method}
        {@const selected = surplusOptions.find(o => o.id === $surplusConfig.method)}
        {#if selected?.description}
          <p class="method-description">{selected.description}</p>
        {/if}
      {/if}
    {/if}

    <div class="surplus-row">
      <label class="surplus-label">{$t('planner.surplus.when')}</label>
      <div class="surplus-datetime-row">
        <DatePicker bind:value={surplusDate} on:change={e => handleSurplusDateChange(e.detail)} />
        <TimePicker value={surplusTimeStr} on:change={e => handleSurplusTimeChange(e.detail)} />
      </div>
    </div>
  {/if}
</div>

<style>
  .surplus-config {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1rem 1.25rem;
  }

  .surplus-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .surplus-label {
    font-size: 0.85rem;
    color: var(--text-muted);
    font-weight: 500;
    min-width: 5.5rem;
  }

  .surplus-input {
    width: 5rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.35rem 0.5rem;
    font-size: 0.85rem;
    color: var(--text);
    text-align: center;
  }

  .surplus-input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .surplus-select {
    flex: 1;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.35rem 0.5rem;
    font-size: 0.85rem;
    color: var(--text);
    font-family: inherit;
  }

  .surplus-select:focus {
    outline: none;
    border-color: var(--accent);
  }

  .method-description {
    font-size: 0.8rem;
    color: var(--text-muted);
    font-style: italic;
    padding-left: 6.25rem;
  }

  .surplus-datetime-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    flex: 1;
  }
</style>
