<script>
  import { createEventDispatcher } from 'svelte';
  import { fmt } from '../../format.js';

  const dispatch = createEventDispatcher();

  export let value; // Date object

  let inputEl;

  function toISODate(date) {
    if (!date) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function openPicker() {
    try { inputEl?.showPicker(); } catch (e) { inputEl?.focus(); }
  }

  function handleChange(e) {
    const val = e.target.value;
    if (!val) return;
    const [y, m, d] = val.split('-').map(Number);
    const updated = new Date(value);
    updated.setFullYear(y, m - 1, d);
    value = updated;
    dispatch('change', value);
  }

  $: displayValue = $fmt.date(value);
  $: isoValue = toISODate(value);
</script>

<div class="date-picker-wrapper">
  <button type="button" class="picker-btn" on:click={openPicker}>
    {displayValue}
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="calendar-icon">
      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
      <line x1="2" y1="6" x2="14" y2="6" stroke="currentColor" stroke-width="1.2"/>
      <line x1="5" y1="1.5" x2="5" y2="4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <line x1="11" y1="1.5" x2="11" y2="4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    </svg>
  </button>
  <input
    type="date"
    bind:this={inputEl}
    class="sr-only"
    value={isoValue}
    on:change={handleChange}
  />
</div>

<style>
  .date-picker-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .picker-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.45rem 0.75rem;
    font-size: 0.9rem;
    color: var(--text);
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    transition: border-color 0.15s;
  }

  .picker-btn:hover {
    border-color: var(--accent);
  }

  .picker-btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .calendar-icon {
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
</style>
