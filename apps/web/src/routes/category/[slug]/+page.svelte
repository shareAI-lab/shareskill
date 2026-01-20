<script lang="ts">
  import type { PageData } from './$types';
  import SkillCard from '$components/skill/SkillCard.svelte';
  import { _, locale } from 'svelte-i18n';
  import { getCategoryLabel, getCategoryHint } from '$lib/utils/translations';

  let { data }: { data: PageData } = $props();

  const currentLang = $derived($locale?.split('-')[0] || 'en');
</script>

<svelte:head>
  <title>{getCategoryLabel(data.category, currentLang)} - ShareSkill</title>
  <meta name="description" content={getCategoryHint(data.category, currentLang)} />
</svelte:head>

<div class="container py-8">
  <!-- Page Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
      {getCategoryLabel(data.category, currentLang)}
    </h1>
    <p class="text-gray-600 dark:text-gray-400">{getCategoryHint(data.category, currentLang)}</p>
  </div>

  <!-- Results Bar -->
  <div class="flex items-center justify-between mb-6">
    <p class="text-gray-600 dark:text-gray-400">
      {data.pagination.total} {$_('common.skills')}
    </p>
    <div class="flex items-center gap-4">
      <select
        class="px-3 py-1.5 border border-gray-300 dark:border-neutral-700 rounded text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
        onchange={(e) => {
          const url = new URL(window.location.href);
          url.searchParams.set('sort', (e.target as HTMLSelectElement).value);
          window.location.href = url.toString();
        }}
      >
        <option value="stars" selected={data.sort === 'stars'}>{$_('search.stars')}</option>
        <option value="latest" selected={data.sort === 'latest'}>{$_('search.recent')}</option>
      </select>
    </div>
  </div>

  <!-- Results -->
  {#if data.items.length > 0}
    <div class="space-y-4">
      {#each data.items as skill}
        <SkillCard {skill} />
      {/each}
    </div>

    <!-- Pagination -->
    {#if data.pagination.total_pages > 1}
      <div class="flex justify-center gap-2 mt-8">
        {#if data.pagination.page > 1}
          <a
            href="/category/{data.category.key}?page={data.pagination.page - 1}&sort={data.sort}"
            class="px-4 py-2 border border-gray-300 dark:border-neutral-700 rounded hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
          >
            {$_('common.previous')}
          </a>
        {/if}
        <span class="px-4 py-2 text-gray-600 dark:text-gray-400">
          {$_('common.page', { values: { current: data.pagination.page, total: data.pagination.total_pages } })}
        </span>
        {#if data.pagination.page < data.pagination.total_pages}
          <a
            href="/category/{data.category.key}?page={data.pagination.page + 1}&sort={data.sort}"
            class="px-4 py-2 border border-gray-300 dark:border-neutral-700 rounded hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
          >
            {$_('common.next')}
          </a>
        {/if}
      </div>
    {/if}
  {:else}
    <div class="text-center py-16">
      <p class="text-gray-500 dark:text-gray-400 text-lg">{$_('search.noResults')}</p>
    </div>
  {/if}
</div>
