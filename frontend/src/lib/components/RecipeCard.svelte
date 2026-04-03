<script>
  import { imageUrl } from '../api.js';
  import FavoriteToggle from './FavoriteToggle.svelte';

  export let recipe;

  let imgFailed = false;

  $: heroSrc = imageUrl(recipe.id, 'hero.jpg');
  $: yieldText = recipe.baseYield
    ? `${recipe.baseYield.amount} ${recipe.baseYield.unit}`
    : '';
  $: totalDuration = computeTotalDuration(recipe);

  function computeTotalDuration(r) {
    if (!r.phases) return null;
    let total = 0;
    for (const phase of r.phases) {
      if (!phase.steps) continue;
      for (const step of phase.steps) {
        if (step.duration && step.duration.ideal) {
          total += step.duration.ideal;
        }
      }
    }
    return total > 0 ? total : null;
  }

  function formatDuration(minutes) {
    if (!minutes) return '';
    if (minutes < 60) return `~${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `~${h}h`;
    return `~${h}h ${m}min`;
  }

  function handleImgError() {
    imgFailed = true;
  }
</script>

<a href="#/recipe/{recipe.id}" class="recipe-card">
  <div class="card-image">
    {#if !imgFailed}
      <img src={heroSrc} alt={recipe.name} on:error={handleImgError} />
    {:else}
      <div class="card-image-placeholder"></div>
    {/if}
  </div>

  <div class="card-body">
    <div class="card-header">
      <h2>{recipe.name}</h2>
      <FavoriteToggle id={recipe.id} bind:favorite={recipe.favorite} />
    </div>

    {#if recipe.description}
      <p class="card-description">{recipe.description}</p>
    {/if}

    <div class="card-meta">
      {#if yieldText}
        <span class="meta-item">{yieldText}</span>
      {/if}
      {#if totalDuration}
        <span class="meta-item">{formatDuration(totalDuration)}</span>
      {/if}
    </div>
  </div>
</a>

<style>
  .recipe-card {
    display: flex;
    flex-direction: column;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: border-color 0.2s, transform 0.15s;
    color: var(--text);
    text-decoration: none;
  }

  .recipe-card:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
  }

  .card-image {
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background: var(--bg-elevated);
  }

  .card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .card-image-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%);
  }

  .card-body {
    padding: 1rem 1.25rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .card-header h2 {
    font-size: 1.1rem;
    margin: 0;
    line-height: 1.3;
  }

  .card-description {
    font-size: 0.85rem;
    color: var(--text-muted);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-meta {
    display: flex;
    gap: 1rem;
    margin-top: auto;
    padding-top: 0.5rem;
  }

  .meta-item {
    font-size: 0.8rem;
    color: var(--text-muted);
    background: var(--bg-elevated);
    padding: 0.2rem 0.5rem;
    border-radius: var(--radius);
  }
</style>
