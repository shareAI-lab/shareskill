<script lang="ts">
  import type { PageData } from './$types';
  import SkillCard from '$components/skill/SkillCard.svelte';
  import { _ } from 'svelte-i18n';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.query ? $_('search.pageTitle', { values: { query: data.query } }) : $_('nav.exploreSkills') + ' - ShareSkill'}</title>
  <meta name="description" content={data.query ? $_('search.pageDescription', { values: { query: data.query } }) : $_('meta.homeDescription')} />
</svelte:head>

<div class="container py-8">
  <!-- Page Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
      {data.query ? $_('search.title') : $_('nav.exploreSkills')}
    </h1>
    {#if !data.query}
      <p class="text-gray-600 dark:text-gray-400">{$_('categories.subtitle')}</p>
    {/if}
  </div>

  <!-- Search Form -->
  <form action="/search" method="get" class="mb-8">
    <div class="relative max-w-2xl">
      <input
        type="text"
        name="q"
        value={data.query}
        placeholder={$_('search.placeholder')}
        class="w-full px-4 py-3 border border-gray-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
      />
      <button
        type="submit"
        class="absolute right-2 top-1/2 -translate-y-1/2 bg-primary-600 text-white px-4 py-1.5 rounded hover:bg-primary-700 transition-colors"
      >
        {$_('common.search')}
      </button>
    </div>
  </form>

  <!-- Results Bar -->
  <div class="flex items-center justify-between mb-6">
    <p class="text-gray-600 dark:text-gray-400">
      {#if data.query}
        {$_('search.results', { values: { count: data.pagination.total, query: data.query } })}
      {:else}
        {data.pagination.total} {$_('common.skills')}
      {/if}
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
        <option value="relevance" selected={data.sort === 'relevance'}>{$_('search.relevance')}</option>
        <option value="latest" selected={data.sort === 'latest'}>{$_('search.recent')}</option>
        <option value="stars" selected={data.sort === 'stars'}>{$_('search.stars')}</option>
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
            href="/search?{data.query ? `q=${encodeURIComponent(data.query)}&` : ''}page={data.pagination.page - 1}&sort={data.sort}"
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
            href="/search?{data.query ? `q=${encodeURIComponent(data.query)}&` : ''}page={data.pagination.page + 1}&sort={data.sort}"
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
      <p class="text-gray-400 dark:text-gray-500 mt-2">{$_('search.noResultsHint')}</p>
    </div>
  {/if}
</div>
