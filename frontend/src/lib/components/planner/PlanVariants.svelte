<script>
  import { t } from '../../i18n/index.js';
  import { targetTime, direction, schedule, surplusConfig, surplusSchedule } from '../../stores/planner.js';
  import { recipe } from '../../stores/recipe.js';
  import { formatDuration } from '../../scheduler/solver.js';
  import { fmt } from '../../format.js';

  /**
   * Group steps by day for display.
   * Returns an array of { label: string, steps: [] }.
   */
  function groupByDay(steps) {
    const groups = new Map();
    for (const step of steps) {
      const dayKey = $fmt.dayLabel(step.start);
      if (!groups.has(dayKey)) {
        groups.set(dayKey, []);
      }
      groups.get(dayKey).push(step);
    }
    return Array.from(groups.entries()).map(([label, steps]) => ({ label, steps }));
  }

  function formatTime(date) {
    return $fmt.time(date);
  }

  function formatRange(step) {
    return `${formatTime(step.start)} — ${formatTime(step.end)}`;
  }

  function variantLabel(id) {
    return $t(`planner.variant.${id}`);
  }

  function variantTimeLabel(variant) {
    const time = formatTime(variant.targetTime);
    if ($direction === 'backward') {
      return $t('planner.variant.mealAt', { time });
    }
    return $t('planner.variant.startAt', { time });
  }

  function isActive(variant) {
    return Math.abs(variant.targetTime.getTime() - $targetTime.getTime()) < 60000;
  }

  function startsInPast(variant) {
    return variant.schedule.startTime && variant.schedule.startTime < new Date();
  }

  function useVariant(variant) {
    $targetTime = new Date(variant.targetTime);
  }

  function getAdjustment(variant, stepId) {
    return variant.adjustments.find(a => a.stepId === stepId);
  }

  function isConflictStep(schedule, stepId) {
    return schedule.warnings.some(w => w.stepId === stepId);
  }

  // Single plan view (no variants / no conflicts)
  $: hasVariants = $schedule && $schedule.variants && $schedule.variants.length > 0;
  $: singleDayGroups = $schedule && !hasVariants ? groupByDay($schedule.steps) : [];

  // Surplus schedule display
  $: surplusMethodName = $surplusConfig.method && $recipe?.surplus?.options
    ? ($recipe.surplus.options.find(o => o.id === $surplusConfig.method)?.name || '')
    : '';
  $: surplusDayGroups = $surplusSchedule ? groupByDay($surplusSchedule.steps) : [];
  $: showSurplus = $surplusSchedule && $surplusConfig.enabled;
</script>

{#if $schedule && $schedule.steps.length > 0}
  <div class="plan-variants">

    {#if hasVariants}
      <!-- Variant comparison cards -->
      {#each $schedule.variants as variant (variant.id)}
        {@const active = isActive(variant)}
        {@const past = startsInPast(variant)}
        {@const dayGroups = groupByDay(variant.schedule.steps)}
        <div class="variant-card" class:active class:past>
          <!-- Header -->
          <div class="variant-header">
            <span class="variant-label">{variantLabel(variant.id)}</span>
            {#if variant.schedule.warnings.length === 0}
              <span class="badge badge-ok">{$t('planner.variant.noConflicts')}</span>
            {:else}
              <span class="badge badge-warn">{$t('planner.variant.conflicts', { count: variant.schedule.warnings.length })}</span>
            {/if}
          </div>
          <div class="variant-time">{variantTimeLabel(variant)}</div>

          {#if past}
            <div class="past-note">{$t('planner.variant.startsInPast')}</div>
          {/if}

          <!-- Steps grouped by day -->
          {#each dayGroups as day}
            <div class="day-group">
              <h4 class="day-label">{day.label}</h4>
              <ul class="step-list">
                {#each day.steps as step}
                  {@const conflict = isConflictStep(variant.schedule, step.id)}
                  {@const adj = getAdjustment(variant, step.id)}
                  <li class="step-item" class:passive={step.type === 'passive'} class:conflict>
                    <span class="step-main">
                      <span class="step-emoji">{conflict ? '⚠' : (step.emoji || '')}</span>
                      <span class="step-name">{step.name}</span>
                    </span>
                    <span class="step-details">
                      <span class="step-duration">
                        {#if adj}
                          <span class="adjusted">
                            {formatDuration(adj.from)} → {formatDuration(adj.to)}
                            <em>({adj.delta > 0 ? '+' : '\u2212'}{formatDuration(Math.abs(adj.delta))})</em>
                          </span>
                        {:else}
                          {formatDuration(step.duration)}
                        {/if}
                      </span>
                      <span class="step-time">{formatRange(step)}</span>
                    </span>
                  </li>
                {/each}
              </ul>
            </div>
          {/each}

          <!-- Surplus steps -->
          {#if showSurplus}
            <div class="surplus-section">
              <h4 class="surplus-heading">
                {surplusMethodName} — {$t('planner.surplus.when')} {formatTime($surplusConfig.targetTime)}
              </h4>
              {#each surplusDayGroups as day}
                <div class="day-group">
                  <h4 class="day-label">{day.label}</h4>
                  <ul class="step-list">
                    {#each day.steps as step}
                      <li class="step-item" class:passive={step.type === 'passive'}>
                        <span class="step-main">
                          <span class="step-emoji">{step.emoji || ''}</span>
                          <span class="step-name">{step.name}</span>
                        </span>
                        <span class="step-details">
                          <span class="step-duration">{formatDuration(step.duration)}</span>
                          <span class="step-time">{formatRange(step)}</span>
                        </span>
                      </li>
                    {/each}
                  </ul>
                </div>
              {/each}
            </div>
          {/if}

          <!-- Footer -->
          {#if !active}
            <div class="variant-footer">
              <button class="use-btn" disabled={past} on:click={() => useVariant(variant)}>
                {$t('planner.variant.useThisPlan')}
              </button>
            </div>
          {/if}
        </div>
      {/each}

    {:else}
      <!-- Single plan view (no conflicts, no variants) -->
      <div class="variant-card active single">
        <div class="variant-header">
          <span class="badge badge-ok">{$t('planner.variant.noConflicts')}</span>
        </div>

        {#each singleDayGroups as day}
          <div class="day-group">
            <h4 class="day-label">{day.label}</h4>
            <ul class="step-list">
              {#each day.steps as step}
                <li class="step-item" class:passive={step.type === 'passive'}>
                  <span class="step-main">
                    <span class="step-emoji">{step.emoji || ''}</span>
                    <span class="step-name">{step.name}</span>
                  </span>
                  <span class="step-details">
                    <span class="step-duration">{formatDuration(step.duration)}</span>
                    <span class="step-time">{formatRange(step)}</span>
                  </span>
                </li>
              {/each}
            </ul>
          </div>
        {/each}

        <!-- Surplus steps (single plan view) -->
        {#if showSurplus}
          <div class="surplus-section">
            <h4 class="surplus-heading">
              {surplusMethodName} — {$t('planner.surplus.when')} {formatTime($surplusConfig.targetTime)}
            </h4>
            {#each surplusDayGroups as day}
              <div class="day-group">
                <h4 class="day-label">{day.label}</h4>
                <ul class="step-list">
                  {#each day.steps as step}
                    <li class="step-item" class:passive={step.type === 'passive'}>
                      <span class="step-main">
                        <span class="step-emoji">{step.emoji || ''}</span>
                        <span class="step-name">{step.name}</span>
                      </span>
                      <span class="step-details">
                        <span class="step-duration">{formatDuration(step.duration)}</span>
                        <span class="step-time">{formatRange(step)}</span>
                      </span>
                    </li>
                  {/each}
                </ul>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

  </div>
{/if}

<style>
  .plan-variants {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .variant-card {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1rem 1.25rem;
    overflow: hidden;
  }

  .variant-card.active {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }

  .variant-card.past {
    opacity: 0.55;
  }

  .variant-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .variant-label {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--text);
  }

  .variant-time {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
  }

  .badge {
    font-size: 0.75rem;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    font-weight: 500;
    white-space: nowrap;
  }

  .badge-ok {
    background: rgba(34, 197, 94, 0.12);
    color: #16a34a;
  }

  .badge-warn {
    background: rgba(245, 158, 11, 0.12);
    color: var(--warning, #f59e0b);
  }

  .past-note {
    font-size: 0.8rem;
    color: var(--text-muted);
    font-style: italic;
    margin-bottom: 0.5rem;
  }

  .day-group {
    margin-bottom: 0.75rem;
  }

  .day-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--accent);
    margin-bottom: 0.35rem;
  }

  .step-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .step-item {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    padding: 0.15rem 0;
    font-size: 0.82rem;
    color: var(--text);
    font-weight: 500;
  }

  .step-item.passive {
    color: var(--text-muted);
    font-weight: 400;
  }

  .step-item.conflict {
    color: var(--warning, #f59e0b);
  }

  .step-main {
    display: flex;
    gap: 0.35rem;
    align-items: flex-start;
  }

  .step-emoji {
    min-width: 1.3rem;
    width: auto;
    text-align: center;
    flex-shrink: 0;
    line-height: 1.3;
  }

  .step-name {
    flex: 1;
    min-width: 4rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .step-details {
    display: flex;
    gap: 0.5rem;
    padding-left: 1.65rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .step-duration {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .step-duration .adjusted {
    white-space: normal;
    word-break: break-word;
  }

  .step-time {
    font-size: 0.75rem;
    color: var(--text-muted);
    white-space: nowrap;
    flex-shrink: 0;
    margin-left: auto;
  }

  .adjusted {
    color: var(--accent);
    font-weight: 500;
  }

  .adjusted em {
    font-size: 0.72rem;
  }

  .surplus-section {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px dashed var(--border);
  }

  .surplus-heading {
    font-size: 0.85rem;
    color: var(--accent);
    margin-bottom: 0.5rem;
  }

  .variant-footer {
    margin-top: 0.75rem;
  }

  .use-btn {
    background: var(--accent);
    color: white;
    border: none;
    border-radius: var(--radius);
    padding: 0.45rem 1rem;
    font-size: 0.85rem;
    cursor: pointer;
    font-family: inherit;
    font-weight: 500;
    transition: opacity 0.15s;
    min-height: 44px;
  }

  .use-btn:hover:not(:disabled) {
    opacity: 0.85;
  }

  .use-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  @media (min-width: 768px) {
    .plan-variants {
      flex-direction: row;
      flex-wrap: wrap;
    }

    .variant-card {
      flex: 1 1 280px;
      max-width: 400px;
    }

    .variant-card.single {
      max-width: 100%;
    }
  }

  @media (max-width: 640px) {
    .step-details {
      flex-wrap: wrap;
    }
  }
</style>
