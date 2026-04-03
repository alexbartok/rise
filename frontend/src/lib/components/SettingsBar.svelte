<script>
  import { locale, availableLocales } from '../i18n/index.js';
  import { appSettings, updateSetting } from '../stores/appSettings.js';

  function handleLocaleChange(e) {
    $locale = e.target.value;
  }
</script>

<div class="settings-row">
  <select class="settings-select" value={$locale} on:change={handleLocaleChange}>
    {#each availableLocales as loc}
      <option value={loc}>{loc.toUpperCase()}</option>
    {/each}
  </select>
  <select class="settings-select" value={$appSettings.timeFormat} on:change={e => updateSetting('timeFormat', e.target.value)}>
    <option value="24h">24h</option>
    <option value="12h">12h</option>
  </select>
  <select class="settings-select" value={$appSettings.dateFormat} on:change={e => updateSetting('dateFormat', e.target.value)}>
    <option value="DD.MM.YYYY">DD.MM.</option>
    <option value="MM/DD/YYYY">MM/DD</option>
    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
  </select>
</div>

<style>
  .settings-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .settings-select {
    background: var(--bg-surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.35rem 0.6rem;
    font-size: 0.8rem;
    cursor: pointer;
    font-family: inherit;
  }

  .settings-select:hover {
    border-color: var(--accent);
  }

  .settings-select:focus {
    outline: none;
    border-color: var(--accent);
  }
</style>
