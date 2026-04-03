<script>
  import { t } from '../../i18n/index.js';
  import { recipe, multiplier } from '../../stores/recipe.js';
  import { unsocialStart, unsocialEnd } from '../../stores/settings.js';
  import { appSettings } from '../../stores/appSettings.js';
  import { targetTime, schedule } from '../../stores/planner.js';
  import { fmt } from '../../format.js';
  import DirectionToggle from './DirectionToggle.svelte';
  import SurplusConfig from './SurplusConfig.svelte';
  import PlanVariants from './PlanVariants.svelte';
  import IcsDownload from './IcsDownload.svelte';
  import DatePicker from '../ui/DatePicker.svelte';
  import TimePicker from '../ui/TimePicker.svelte';

  const quickMultipliers = [0.5, 1, 2, 3];

  function toTimeString(date) {
    if (!date) return '12:00';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function handleTargetDateChange(newDate) {
    $targetTime = newDate;
  }

  function handleTargetTimeChange(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const current = new Date($targetTime);
    current.setHours(h, m, 0, 0);
    $targetTime = current;
  }

  function formatScheduleTime(date) {
    if (!date) return '?';
    const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
    return `${weekday} ${$fmt.dateTime(date)}`;
  }

  $: targetDate = $targetTime;
  $: targetTimeStr = toTimeString($targetTime);
  $: scheduleSummaryStart = $schedule ? ($fmt, formatScheduleTime($schedule.startTime)) : '';
  $: scheduleSummaryEnd = $schedule ? ($fmt, formatScheduleTime($schedule.endTime)) : '';

  $: hasSurplus = $recipe?.surplus?.enabled === true;
</script>

<div class="planner-config">
  <!-- Direction toggle -->
  <div class="config-section">
    <DirectionToggle />
  </div>

  <!-- Target date/time -->
  <div class="config-section">
    <span class="config-label">{$t('planner.targetTime')}</span>
    <div class="datetime-row">
      <DatePicker bind:value={targetDate} on:change={e => handleTargetDateChange(e.detail)} />
      <TimePicker value={targetTimeStr} on:change={e => handleTargetTimeChange(e.detail)} />
    </div>
  </div>

  <!-- Multiplier -->
  <div class="config-section">
    <label class="config-label" for="planner-multiplier">{$t('planner.multiplier')}</label>
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
        id="planner-multiplier"
        type="number"
        class="multiplier-input"
        min="0.1"
        step="0.1"
        bind:value={$multiplier}
      />
    </div>
  </div>

  <!-- Unsocial hours -->
  <div class="config-section">
    <div class="unsocial-row">
      <span class="config-label">{$t('planner.unsocial.label')}</span>
      <TimePicker value={$unsocialEnd} on:change={e => $unsocialEnd = e.detail} />
      <span class="unsocial-to">{$t('planner.unsocial.to')}</span>
      <TimePicker value={$unsocialStart} on:change={e => $unsocialStart = e.detail} />
    </div>
  </div>

  <!-- Surplus config -->
  {#if hasSurplus}
    <div class="config-section">
      <SurplusConfig />
    </div>
  {/if}

  <!-- Schedule summary / debug preview -->
  <div class="schedule-summary">
    {#if $schedule}
      <p class="summary-line">
        {$t('planner.plan.summary', { start: scheduleSummaryStart, end: scheduleSummaryEnd, count: $schedule.steps.length })}
      </p>
      {#if $schedule.warnings.length > 0}
        <p class="summary-warnings">
          {$t('planner.plan.warnings', { count: $schedule.warnings.length })}
        </p>
      {/if}
    {:else}
      <p class="summary-empty">{$t('planner.plan.noSchedule')}</p>
    {/if}
  </div>

  <!-- Plan variants -->
  {#if $schedule}
    <PlanVariants />
    <IcsDownload />
  {/if}
</div>

<style>
  .planner-config {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .config-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .config-label {
    font-size: 0.85rem;
    color: var(--text-muted);
    font-weight: 500;
  }

  .datetime-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
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
    font-family: inherit;
    min-width: 44px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
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

  .unsocial-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .unsocial-to {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .schedule-summary {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1rem 1.25rem;
  }

  .summary-line {
    font-size: 0.9rem;
    color: var(--text);
  }

  .summary-warnings {
    font-size: 0.85rem;
    color: var(--warning);
    margin-top: 0.35rem;
  }

  .summary-empty {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  /* Mobile: stack controls vertically, full-width datetime */
  @media (max-width: 640px) {
    .datetime-row {
      flex-direction: column;
    }

    .multiplier-controls {
      flex-wrap: wrap;
    }

    .unsocial-row {
      flex-direction: column;
      align-items: stretch;
    }
  }

  /* Desktop: controls get more horizontal space */
  @media (min-width: 1024px) {
    .multiplier-controls {
      gap: 0.5rem;
    }
  }

</style>
