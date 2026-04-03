<script>
  import { t } from '../../i18n/index.js';
  import { recipe, multiplier, scaledIngredients, optionals } from '../../stores/recipe.js';
  import OptionalToggle from './OptionalToggle.svelte';

  function formatDuration(minutes) {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h} h`;
    return `${h} h ${m} min`;
  }

  function resolveTemplate(text, $recipe, $multiplier, $scaledIngredients) {
    if (!text) return '';
    return text.replace(/\{\{(\w+):([^}]+)\}\}/g, (match, type, name) => {
      if (type === 'ingredient') {
        for (const group of $scaledIngredients) {
          const item = group.items.find(i => i.name === name);
          if (item) {
            const amt = formatAmount(item.scaledAmount);
            return `${amt} ${item.unit}`;
          }
        }
        return match;
      }
      if (type === 'yield') {
        if (!$recipe.baseYield) return match;
        if (name === 'amount') {
          return String(Math.round($recipe.baseYield.amount * $multiplier));
        }
        if (name === 'weightPerUnit') {
          const wpu = $recipe.baseYield.weightPerUnit;
          if (!wpu) return match;
          return `${wpu.min}-${wpu.max}`;
        }
      }
      return match;
    });
  }

  function formatAmount(val) {
    if (val == null) return '';
    if (Number.isInteger(val)) return String(val);
    const rounded = Math.round(val * 10) / 10;
    if (Number.isInteger(rounded)) return String(rounded);
    return rounded.toFixed(1);
  }

  $: phases = $recipe ? $recipe.phases : [];
</script>

<section class="phase-steps">
  {#each phases as phase}
    <div class="phase">
      <h3 class="phase-name">{phase.name}</h3>
      <div class="steps">
        {#each phase.steps as step}
          {@const isOptional = step.optional === true}
          {@const enabled = !isOptional || $optionals[step.id] === true}
          <div class="step" class:disabled={!enabled}>
            <div class="step-header">
              <span class="step-emoji">{step.emoji || ''}</span>
              <span class="step-name">{step.name}</span>
              <span class="type-badge" class:active-type={step.type === 'active'} class:passive-type={step.type === 'passive'}>
                {step.type === 'active' ? $t('recipe.step.type.active') : $t('recipe.step.type.passive')}
              </span>
              {#if step.duration && step.duration.ideal}
                <span class="duration">{formatDuration(step.duration.ideal)}</span>
              {/if}
              {#if isOptional}
                <OptionalToggle key={step.id} />
              {/if}
            </div>
            {#if step.description}
              <p class="step-description">{resolveTemplate(step.description, $recipe, $multiplier, $scaledIngredients)}</p>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/each}
</section>

<style>
  .phase-steps {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .phase-name {
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
    color: var(--text);
  }

  .steps {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .step {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1rem 1.25rem;
    transition: opacity 0.2s;
  }

  .step.disabled {
    opacity: 0.4;
  }

  .step-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 0.5rem;
  }

  .step-emoji {
    font-size: 1.1rem;
  }

  .step-name {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .type-badge {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius);
  }

  .type-badge.active-type {
    background: var(--active-step);
    color: #000;
  }

  .type-badge.passive-type {
    background: var(--passive-step);
    color: var(--text);
  }

  .duration {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-left: auto;
  }

  .step-description {
    font-size: 0.85rem;
    color: var(--text-muted);
    line-height: 1.6;
    white-space: pre-line;
  }
</style>
