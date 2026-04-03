<script>
  import { t } from '../../i18n/index.js';

  export let notes = [];

  let openIndex = -1;

  function toggle(i) {
    openIndex = openIndex === i ? -1 : i;
  }
</script>

{#if notes.length > 0}
  <section class="notes">
    <h3 class="notes-heading">{$t('recipe.notes')}</h3>
    <div class="notes-list">
      {#each notes as note, i}
        <button class="note-card" class:open={openIndex === i} on:click={() => toggle(i)}>
          <div class="note-header">
            <span class="note-title">{note.title}</span>
            <span class="chevron">{openIndex === i ? '\u25B2' : '\u25BC'}</span>
          </div>
          {#if openIndex === i}
            <p class="note-content">{note.content}</p>
          {/if}
        </button>
      {/each}
    </div>
  </section>
{/if}

<style>
  .notes {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .notes-heading {
    font-size: 1.1rem;
    color: var(--text);
  }

  .notes-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .note-card {
    display: block;
    width: 100%;
    text-align: left;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 0.85rem 1.1rem;
    cursor: pointer;
    transition: border-color 0.2s;
    color: var(--text);
    font-family: inherit;
    font-size: inherit;
    min-height: 44px;
  }

  .note-card:hover {
    border-color: var(--accent);
  }

  .note-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .note-title {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .chevron {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .note-content {
    margin-top: 0.65rem;
    font-size: 0.85rem;
    color: var(--text-muted);
    line-height: 1.6;
    white-space: pre-line;
  }
</style>
