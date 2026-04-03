<script>
  import { onMount } from 'svelte';
  import { t, locale } from '../lib/i18n/index.js';
  import { fetchRecipes } from '../lib/api.js';
  import RecipeCard from '../lib/components/RecipeCard.svelte';
  import SettingsBar from '../lib/components/SettingsBar.svelte';

  let recipes = [];
  let loading = true;

  function getLastUsed(id) {
    const ts = localStorage.getItem(`rise-last-used-${id}`);
    return ts ? parseInt(ts, 10) : 0;
  }

  function sortRecipes(list) {
    return [...list].sort((a, b) => {
      // Favorites first
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;

      // Then by last-used timestamp (most recent first)
      const aUsed = getLastUsed(a.id);
      const bUsed = getLastUsed(b.id);
      if (aUsed !== bUsed) return bUsed - aUsed;

      // Then alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }

  $: sorted = sortRecipes(recipes);

  let mounted = false;

  async function loadRecipes(lang) {
    try {
      recipes = await fetchRecipes(lang);
    } catch (e) {
      console.error('Failed to fetch recipes:', e);
    } finally {
      loading = false;
    }
  }

  onMount(() => { mounted = true; });
  $: if (mounted) loadRecipes($locale);


</script>

<div class="container">
  <header>
    <div class="header-row">
      <div>
        <h1>{$t('app.title')}</h1>
        <p>{$t('app.subtitle')}</p>
      </div>
      <SettingsBar />
    </div>
  </header>

  {#if loading}
    <p>{$t('ui.loading')}</p>
  {:else if recipes.length === 0}
    <p>{$t('ui.noRecipesFound')}</p>
  {:else}
    <div class="recipe-grid">
      {#each sorted as recipe (recipe.id)}
        <RecipeCard {recipe} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

</style>
