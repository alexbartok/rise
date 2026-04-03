<script>
  import { t } from '../../i18n/index.js';
  import { recipe, multiplier } from '../../stores/recipe.js';
  import { schedule, surplusSchedule } from '../../stores/planner.js';
  import { timezone } from '../../stores/settings.js';
  import { resolveTemplate } from '../../scheduler/template.js';
  import { generateICS } from '../../ics/generator.js';

  function handleDownload() {
    if (!$schedule || !$recipe) return;

    // Resolve all step descriptions via template engine
    const resolvedSteps = $schedule.steps.map(step => ({
      ...step,
      description: resolveTemplate(step.description, $recipe, $multiplier),
    }));

    // Include surplus schedule steps when available
    if ($surplusSchedule && $surplusSchedule.steps.length > 0) {
      for (const step of $surplusSchedule.steps) {
        resolvedSteps.push({
          ...step,
          description: resolveTemplate(step.description, $recipe, $multiplier),
        });
      }
    }

    // Generate ICS
    const icsString = generateICS(resolvedSteps, $timezone);
    if (!icsString) return;

    // Create Blob and trigger download
    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${$recipe.id}-plan.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Update localStorage with last-used timestamp
    try {
      localStorage.setItem(`rise-last-used-${$recipe.id}`, JSON.stringify(Date.now()));
    } catch {
      // Ignore localStorage errors
    }
  }
</script>

{#if $schedule && $schedule.steps.length > 0}
  <div class="ics-download">
    <button class="download-btn" on:click={handleDownload}>
      {$t('planner.download.ics')}
    </button>
  </div>
{/if}

<style>
  .ics-download {
    margin-top: 0.5rem;
  }

  .download-btn {
    background: var(--accent);
    color: white;
    border: none;
    border-radius: var(--radius);
    padding: 0.6rem 1.25rem;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    transition: opacity 0.15s;
    width: 100%;
    min-height: 44px;
  }

  .download-btn:hover {
    opacity: 0.9;
  }

  .download-btn:active {
    opacity: 0.8;
  }
</style>
