<script lang="ts">
  import type { PageData } from './$types';
  import SkillCard from '$components/skill/SkillCard.svelte';
  import { _, locale } from 'svelte-i18n';
  import { getCategoryLabel, getCategoryHint } from '$lib/utils/translations';

  let { data }: { data: PageData } = $props();

  const currentLang = $derived($locale?.split('-')[0] || 'en');
  const categoryLabel = $derived(getCategoryLabel(data.category, currentLang));
  const categoryHint = $derived(getCategoryHint(data.category, currentLang));
</script>

<svelte:head>
  <title>{$_('meta.categoryTitle', { values: { category: categoryLabel } })}</title>
  <meta name="description" content={$_('meta.categoryDescription', { values: { category: categoryLabel } })} />
</svelte:head>

<div class="container py-12">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">{categoryLabel}</h1>
    <p class="text-gray-600 dark:text-gray-400">{categoryHint}</p>
    <p class="text-sm text-gray-400 dark:text-gray-500 mt-2">{data.pagination.total} {$_('common.skills')}</p>
  </div>

  <div class="flex items-center justify-between mb-6">
    <div class="flex gap-2">
      <a
        href="?sort=stars"
        class="px-3 py-1 rounded-full text-sm {data.sort === 'stars'
          ? 'bg-primary-600 text-white'
          : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700'}"
      >
        {$_('common.mostStars')}
      </a>
      <a
        href="?sort=latest"
        class="px-3 py-1 rounded-full text-sm {data.sort === 'latest'
          ? 'bg-primary-600 text-white'
          : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700'}"
      >
        {$_('common.latest')}
      </a>
    </div>
  </div>

  {#if data.items.length === 0}
    <div class="text-center py-16">
      <p class="text-gray-500 dark:text-gray-400 text-lg">{$_('categories.noSkillsYet')}</p>
      <a href="/" class="text-primary-600 hover:underline mt-4 inline-block">{$_('common.browseCategories')}</a>
    </div>
  {:else}
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each data.items as skill}
        <SkillCard {skill} />
      {/each}
    </div>

    {#if data.pagination.total_pages > 1}
      <div class="mt-8 flex justify-center gap-2">
        {#if data.pagination.page > 1}
          <a
            href="?page={data.pagination.page - 1}&sort={data.sort}"
            class="px-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
          >
            {$_('common.previous')}
          </a>
        {/if}
        <span class="px-4 py-2 text-gray-600 dark:text-gray-400">
          {$_('common.page', { values: { current: data.pagination.page, total: data.pagination.total_pages } })}
        </span>
        {#if data.pagination.page < data.pagination.total_pages}
          <a
            href="?page={data.pagination.page + 1}&sort={data.sort}"
            class="px-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
          >
            {$_('common.next')}
          </a>
        {/if}
      </div>
    {/if}
  {/if}
</div>
