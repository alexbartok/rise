<script>
  import { t } from '../../i18n/index.js';
  import { optionals } from '../../stores/recipe.js';

  export let key;

  $: enabled = $optionals[key] === true;

  function toggle() {
    optionals.update(o => ({ ...o, [key]: !o[key] }));
  }
</script>

<button class="optional-toggle" class:enabled on:click={toggle}>
  <span class="badge">{$t('optional.label')}</span>
  <span class="switch" aria-label={$t('optional.enable')}>
    <span class="track">
      <span class="thumb"></span>
    </span>
  </span>
</button>

<style>
  .optional-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.15rem 0.5rem;
    cursor: pointer;
    font-size: 0.75rem;
    color: var(--text-muted);
    transition: border-color 0.2s;
  }

  .optional-toggle:hover {
    border-color: var(--accent);
  }

  .badge {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--warning);
  }

  .switch {
    display: inline-flex;
    align-items: center;
  }

  .track {
    display: inline-block;
    width: 28px;
    height: 16px;
    border-radius: 8px;
    background: var(--bg-elevated);
    position: relative;
    transition: background 0.2s;
  }

  .enabled .track {
    background: var(--accent);
  }

  .thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--text-muted);
    transition: transform 0.2s, background 0.2s;
  }

  .enabled .thumb {
    transform: translateX(12px);
    background: white;
  }
</style>
