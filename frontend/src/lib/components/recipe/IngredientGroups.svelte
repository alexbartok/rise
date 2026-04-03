<script>
  import { t } from '../../i18n/index.js';
  import { multiplier, scaledIngredients } from '../../stores/recipe.js';
  import OptionalToggle from './OptionalToggle.svelte';

  const quickMultipliers = [0.5, 1, 2, 3];

  function formatAmount(val) {
    if (val == null) return '';
    if (Number.isInteger(val)) return String(val);
    const rounded = Math.round(val * 10) / 10;
    if (Number.isInteger(rounded)) return String(rounded);
    return rounded.toFixed(1);
  }
</script>

<section class="ingredient-groups">
  <div class="multiplier-bar">
    <label class="multiplier-label" for="multiplier-input">{$t('planner.multiplier')}</label>
    <div class="multiplier-controls">
      {#each quickMultipliers as qm}
        <button
          class="quick-btn"
          class:active={$multiplier === qm}
          on:click={() => $multiplier = qm}
        >
          {qm}x
        </button>
      {/each}
      <input
        id="multiplier-input"
        type="number"
        class="multiplier-input"
        min="0.1"
        step="0.1"
        bind:value={$multiplier}
      />
    </div>
  </div>

  {#each $scaledIngredients as group}
    <div class="group">
      <h3 class="group-name">{group.name}</h3>
      <ul class="item-list">
        {#each group.items as item}
          <li class="item" class:disabled={!item.enabled}>
            <span class="amount">{formatAmount(item.scaledAmount)}</span>
            <span class="unit">{item.unit}</span>
            <span class="name">{item.name}</span>
            {#if item.notes}
              <span class="notes">{item.notes}</span>
            {/if}
            {#if item.optional}
              <OptionalToggle key="ingredient:{item.name}" />
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/each}
</section>

<style>
  .ingredient-groups {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .multiplier-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.75rem 1rem;
  }

  .multiplier-label {
    font-size: 0.85rem;
    color: var(--text-muted);
    font-weight: 500;
  }

  .multiplier-controls {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .quick-btn {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.3rem 0.6rem;
    font-size: 0.8rem;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s;
    min-width: 44px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: inherit;
  }

  .quick-btn:hover {
    border-color: var(--accent);
    color: var(--text);
  }

  .quick-btn.active {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
  }

  .multiplier-input {
    width: 4rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.3rem 0.5rem;
    font-size: 0.85rem;
    color: var(--text);
    text-align: center;
  }

  .multiplier-input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .group {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1rem 1.25rem;
  }

  .group-name {
    font-size: 0.95rem;
    margin-bottom: 0.75rem;
    color: var(--text);
  }

  .item-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .item {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
    font-size: 0.9rem;
    flex-wrap: wrap;
    transition: opacity 0.2s;
  }

  .item.disabled {
    opacity: 0.4;
  }

  .amount {
    font-weight: 600;
    color: var(--accent);
    min-width: 3rem;
    text-align: right;
  }

  .unit {
    color: var(--text-muted);
    min-width: 1.5rem;
  }

  .name {
    color: var(--text);
  }

  .notes {
    font-size: 0.78rem;
    color: var(--text-muted);
    font-style: italic;
  }
</style>
