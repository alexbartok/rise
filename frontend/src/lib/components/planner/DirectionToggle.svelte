<script>
  import { t } from '../../i18n/index.js';
  import { direction } from '../../stores/planner.js';
</script>

<div class="direction-toggle">
  <button
    class="toggle-btn"
    class:active={$direction === 'backward'}
    on:click={() => $direction = 'backward'}
  >
    {$t('planner.direction.backward')}
  </button>
  <button
    class="toggle-btn"
    class:active={$direction === 'forward'}
    on:click={() => $direction = 'forward'}
  >
    {$t('planner.direction.forward')}
  </button>
</div>

<style>
  .direction-toggle {
    display: flex;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .toggle-btn {
    flex: 1;
    padding: 0.6rem 0.75rem;
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    font-family: inherit;
    line-height: 1.3;
    min-height: 44px;
  }

  .toggle-btn:hover {
    color: var(--text);
  }

  .toggle-btn.active {
    background: var(--accent);
    color: white;
  }
</style>
