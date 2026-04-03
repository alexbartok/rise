<script>
  import { onMount } from 'svelte';
  import Router from 'svelte-spa-router';
  import RecipeList from './routes/RecipeList.svelte';
  import RecipeView from './routes/RecipeView.svelte';
  import { loadSettings } from './lib/stores/appSettings.js';
  import './app.css';

  const routes = {
    '/': RecipeList,
    '/recipe/:id': RecipeView,
  };

  onMount(() => loadSettings());
</script>

<Router {routes} />
