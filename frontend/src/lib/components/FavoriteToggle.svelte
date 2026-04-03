<script>
  import { t } from '../i18n/index.js';
  import { toggleFavorite } from '../api.js';

  export let id;
  export let favorite;

  let pending = false;

  async function handleClick(e) {
    e.stopPropagation();
    e.preventDefault();
    if (pending) return;

    const newValue = !favorite;
    favorite = newValue; // optimistic update
    pending = true;

    try {
      const resp = await toggleFavorite(id, newValue);
      if (!resp.ok) throw new Error('API error');
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      favorite = !newValue; // revert
    } finally {
      pending = false;
    }
  }
</script>

<button
  class="favorite-toggle"
  class:active={favorite}
  on:click={handleClick}
  aria-label={favorite ? $t('ui.favoriteRemove') : $t('ui.favoriteAdd')}
  disabled={pending}
>
  {favorite ? '\u2665' : '\u2661'}
</button>

<style>
  .favorite-toggle {
    background: none;
    border: none;
    font-size: 1.4rem;
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
    color: var(--text-muted);
    transition: color 0.15s, transform 0.15s;
    min-width: 44px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .favorite-toggle:hover {
    transform: scale(1.15);
  }

  .favorite-toggle.active {
    color: var(--accent);
  }

  .favorite-toggle:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
