<script>
  import { createEventDispatcher } from 'svelte';
  import { appSettings } from '../../stores/appSettings.js';

  const dispatch = createEventDispatcher();

  /** Time value as "HH:MM" (24h string) */
  export let value;

  let editing = false;
  let editText = '';
  let inputEl;

  function formatTimeValue(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    if ($appSettings.timeFormat === '12h') {
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${String(m).padStart(2, '0')} ${period}`;
    }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function startEditing() {
    editing = true;
    editText = formatTimeValue(value);
    // Wait for DOM update, then focus and select
    requestAnimationFrame(() => {
      inputEl?.focus();
      inputEl?.select();
    });
  }

  function commitEdit() {
    editing = false;
    const parsed = parseTimeInput(editText.trim());
    if (parsed) {
      value = parsed;
      dispatch('change', value);
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      editing = false;
    }
  }

  function parseTimeInput(str) {
    // 24h: "14:30" or "14.30"
    let match = str.match(/^(\d{1,2})[:.](\d{2})$/);
    if (match) {
      const h = +match[1], m = +match[2];
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }
    // 12h: "2:30 PM" or "2:30PM"
    match = str.match(/^(\d{1,2})[:.](\d{2})\s*(AM|PM)$/i);
    if (match) {
      let h = +match[1];
      const m = +match[2];
      const period = match[3].toUpperCase();
      if (period === 'PM' && h < 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }
    return null;
  }

  $: displayValue = formatTimeValue(value);
  $: placeholder = $appSettings.timeFormat === '12h' ? 'H:MM AM/PM' : 'HH:MM';
</script>

{#if editing}
  <input
    bind:this={inputEl}
    type="text"
    class="time-input"
    bind:value={editText}
    {placeholder}
    on:blur={commitEdit}
    on:keydown={handleKeydown}
  />
{:else}
  <button type="button" class="time-btn" on:click={startEditing}>
    {displayValue}
  </button>
{/if}

<style>
  .time-btn {
    display: inline-flex;
    align-items: center;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.45rem 0.75rem;
    font-size: 0.9rem;
    color: var(--text);
    cursor: text;
    font-family: inherit;
    white-space: nowrap;
    transition: border-color 0.15s;
  }

  .time-btn:hover {
    border-color: var(--accent);
  }

  .time-btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .time-input {
    background: var(--bg-elevated);
    border: 2px solid var(--accent);
    border-radius: var(--radius);
    padding: 0.4rem 0.7rem;
    font-size: 0.9rem;
    color: var(--text);
    font-family: inherit;
    white-space: nowrap;
    width: 7rem;
    outline: none;
  }
</style>
