<script>
  import { onMount, onDestroy } from 'svelte';
  import { t } from '../lib/i18n/index.js';
  import { fetchRecipe } from '../lib/api.js';
  import { recipe, multiplier, optionals } from '../lib/stores/recipe.js';
  import { targetTime, direction } from '../lib/stores/planner.js';
  import { unsocialStart, unsocialEnd } from '../lib/stores/settings.js';
  import { computeSchedule, findConflictFreeShift } from '../lib/scheduler/solver.js';
  import HeroImage from '../lib/components/recipe/HeroImage.svelte';
  import IngredientGroups from '../lib/components/recipe/IngredientGroups.svelte';
  import PhaseSteps from '../lib/components/recipe/PhaseSteps.svelte';
  import Notes from '../lib/components/recipe/Notes.svelte';
  import ImageGallery from '../lib/components/recipe/ImageGallery.svelte';
  import PlannerConfig from '../lib/components/planner/PlannerConfig.svelte';
  import SettingsBar from '../lib/components/SettingsBar.svelte';

  export let params = {};
  let loading = true;
  let activeTab = 'recipe';

  onMount(async () => {
    try {
      $recipe = await fetchRecipe(params.id);

      // Set smart initial target time (conflict-free)
      if ($recipe) {
        const totalMinutes = $recipe.phases.reduce((sum, phase) =>
          sum + phase.steps.reduce((s, step) => s + step.duration.ideal, 0), 0
        );

        // Naive target: next full hour + total duration
        const now = new Date();
        const nextHour = new Date(now);
        nextHour.setMinutes(0, 0, 0);
        nextHour.setHours(nextHour.getHours() + 1);
        const naiveTarget = new Date(nextHour.getTime() + totalMinutes * 60000);

        // Try this target and check for conflicts
        const options = {
          direction: 'backward',
          targetTime: naiveTarget,
          multiplier: 1,
          optionals: {},
          unsocialStart: $unsocialStart,
          unsocialEnd: $unsocialEnd,
        };
        const testSchedule = computeSchedule($recipe, options);

        if (testSchedule.warnings.length === 0) {
          $targetTime = naiveTarget;
        } else {
          // Find conflict-free time: try later first, then earlier
          const later = findConflictFreeShift($recipe, options, 'later');
          const earlier = !later ? findConflictFreeShift($recipe, options, 'earlier') : null;
          const best = later || earlier;
          $targetTime = best ? best.resultTime : naiveTarget;
        }
      }
    } catch (e) {
      console.error('Failed to fetch recipe:', e);
    } finally {
      loading = false;
    }
  });

  onDestroy(() => {
    $recipe = null;
    $multiplier = 1;
    $optionals = {};
  });
</script>

<div class="container">
  {#if loading}
    <p>{$t('ui.loading')}</p>
  {:else if $recipe}
    <nav class="back-link">
      <div class="back-row">
        <a href="#/">&larr; {$t('recipe.list.title')}</a>
        <SettingsBar />
      </div>
    </nav>

    <header>
      <h1>{$recipe.name}</h1>
      {#if $recipe.description}
        <p class="description">{$recipe.description}</p>
      {/if}
    </header>

    <div class="tab-bar">
      <button
        class="tab-btn"
        class:active={activeTab === 'recipe'}
        on:click={() => activeTab = 'recipe'}
      >
        {$t('recipe.tab.recipe')}
      </button>
      <button
        class="tab-btn"
        class:active={activeTab === 'planner'}
        on:click={() => activeTab = 'planner'}
      >
        {$t('recipe.tab.planner')}
      </button>
    </div>

    {#if activeTab === 'recipe'}
      <div class="recipe-tab">
        <HeroImage recipeId={$recipe.id} />

        <div class="section">
          <h2 class="section-title">{$t('recipe.ingredients')}</h2>
          <IngredientGroups />
        </div>

        <div class="section">
          <h2 class="section-title">{$t('recipe.steps')}</h2>
          <PhaseSteps />
        </div>

        {#if $recipe.notes && $recipe.notes.length > 0}
          <div class="section">
            <Notes notes={$recipe.notes} />
          </div>
        {/if}

        <div class="section">
          <ImageGallery recipeId={$recipe.id} />
        </div>
      </div>
    {:else}
      <div class="planner-tab">
        <PlannerConfig />
      </div>
    {/if}
  {:else}
    <p>{$t('ui.recipeNotFound')}</p>
  {/if}
</div>

<style>
  .back-link {
    margin-bottom: 1rem;
  }

  .back-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .back-link a {
    font-size: 0.9rem;
    color: var(--accent);
  }

  header {
    margin-bottom: 1.25rem;
  }

  header h1 {
    font-size: 1.75rem;
    margin-bottom: 0.25rem;
  }

  .description {
    color: var(--text-muted);
    font-size: 0.95rem;
  }

  .tab-bar {
    display: flex;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    margin-bottom: 1.5rem;
  }

  .tab-btn {
    flex: 1;
    padding: 0.6rem 1rem;
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    font-family: inherit;
    min-height: 44px;
  }

  .tab-btn:hover {
    color: var(--text);
  }

  .tab-btn.active {
    background: var(--accent);
    color: white;
  }

  @media (max-width: 640px) {
    .tab-bar {
      display: flex;
    }
    .tab-btn {
      flex: 1;
      padding: 0.75rem;
      font-size: 1rem;
    }
  }

  .recipe-tab {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .section-title {
    font-size: 1.15rem;
    margin-bottom: 0.75rem;
  }

  .planner-tab {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
</style>
