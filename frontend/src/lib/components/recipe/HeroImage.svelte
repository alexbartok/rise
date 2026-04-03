<script>
  import { imageUrl } from '../../api.js';

  export let recipeId;

  const extensions = ['hero.jpg', 'hero.jpeg', 'hero.png', 'hero.webp'];
  let currentIdx = 0;
  let failed = false;

  $: src = imageUrl(recipeId, extensions[currentIdx]);

  function handleError() {
    if (currentIdx < extensions.length - 1) {
      currentIdx++;
    } else {
      failed = true;
    }
  }
</script>

{#if !failed}
  <div class="hero-image">
    <img {src} alt="" on:error={handleError} />
  </div>
{/if}

<style>
  .hero-image {
    width: 100%;
    max-height: 350px;
    overflow: hidden;
    border-radius: var(--radius-lg);
    margin-bottom: 1.5rem;
  }

  .hero-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    max-height: 350px;
  }
</style>
