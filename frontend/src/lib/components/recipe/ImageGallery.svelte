<script>
  import { onMount } from 'svelte';
  import { t } from '../../i18n/index.js';
  import { fetchImages, imageUrl } from '../../api.js';

  export let recipeId;

  let images = [];
  let enlarged = null;

  onMount(async () => {
    try {
      const all = await fetchImages(recipeId);
      images = (all || []).filter(name => !name.startsWith('hero.'));
    } catch (e) {
      // No images available
    }
  });

  function openImage(name) {
    enlarged = name;
  }

  function closeImage() {
    enlarged = null;
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') closeImage();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if images.length > 0}
  <section class="image-gallery">
    <h3 class="gallery-heading">{$t('recipe.images')}</h3>
    <div class="thumbnail-row">
      {#each images as name}
        <button class="thumb-btn" on:click={() => openImage(name)}>
          <img src={imageUrl(recipeId, name)} alt={name} />
        </button>
      {/each}
    </div>
  </section>
{/if}

{#if enlarged}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="lightbox" on:click={closeImage} role="dialog" aria-modal="true" tabindex="-1">
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="lightbox-inner" on:click|stopPropagation>
      <img src={imageUrl(recipeId, enlarged)} alt={enlarged} />
      <button class="close-btn" on:click={closeImage}>&times;</button>
    </div>
  </div>
{/if}

<style>
  .image-gallery {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .gallery-heading {
    font-size: 1.1rem;
    color: var(--text);
  }

  .thumbnail-row {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    -webkit-overflow-scrolling: touch;
  }

  .thumb-btn {
    flex-shrink: 0;
    width: 100px;
    height: 100px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    cursor: pointer;
    background: var(--bg-elevated);
    padding: 0;
    transition: border-color 0.2s, transform 0.15s;
  }

  .thumb-btn:hover {
    border-color: var(--accent);
    transform: scale(1.05);
  }

  .thumb-btn img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .lightbox {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
  }

  .lightbox-inner {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
  }

  .lightbox-inner img {
    max-width: 100%;
    max-height: 85vh;
    border-radius: var(--radius-lg);
    display: block;
  }

  .close-btn {
    position: absolute;
    top: -1rem;
    right: -1rem;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: none;
    background: var(--bg-surface);
    color: var(--text);
    font-size: 1.2rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
</style>
