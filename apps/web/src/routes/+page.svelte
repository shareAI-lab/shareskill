<script lang="ts">
  import type { PageData } from './$types';
  import SkillCard from '$components/skill/SkillCard.svelte';
  import { Icon } from '$components/ui';
  import { _, locale } from 'svelte-i18n';
  import { getCategoryLabel, getCategoryHint } from '$lib/utils/translations';

  let { data }: { data: PageData } = $props();

  // Get current locale for translations
  const currentLang = $derived($locale?.split('-')[0] || 'en');

  // MCP install command copy state
  let mcpCopied = $state(false);

  function copyMcpCommand() {
    navigator.clipboard.writeText('npx shareskill');
    mcpCopied = true;
    setTimeout(() => (mcpCopied = false), 2000);
  }

  // Category icons (simplified mapping)
  const categoryIcons: Record<string, string> = {
    coding: 'terminal',
    devops: 'package',
    testing: 'shield-check',
    security: 'shield',
    data: 'file',
    ai: 'star',
    design: 'globe',
    writing: 'file',
    media: 'globe',
    business: 'globe',
    marketing: 'globe',
    sales: 'globe',
    finance: 'globe',
    productivity: 'clock',
    communication: 'globe',
    research: 'search',
    education: 'file',
    other: 'tag',
  };
</script>

<svelte:head>
  <title>{$_('meta.homeTitle')}</title>
  <meta name="description" content={$_('meta.homeDescription')} />
</svelte:head>

<!-- Hero Section -->
<section class="hero-bg relative overflow-hidden">
  <div class="grid-pattern absolute inset-0"></div>
  <div class="container relative py-20 md:py-28">
    <div class="max-w-4xl mx-auto text-center">
      <!-- Badge -->
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100/80 dark:bg-primary-900/30 border border-primary-200/50 dark:border-primary-800/50 mb-8 animate-fade-in">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
        </span>
        <span class="text-sm font-medium text-primary-700 dark:text-primary-300">
          {$_('hero.badge', { values: { count: data.summary.total_count.toLocaleString() } })}
        </span>
      </div>

      <!-- Headline -->
      <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold text-gray-900 dark:text-white mb-6 animate-fade-in-up tracking-tight">
        {$_('hero.title1')}
        <span class="gradient-text">{$_('hero.title2')}</span>
        <br class="hidden sm:block" />
        {$_('hero.title3')}
      </h1>

      <!-- Subtitle -->
      <p class="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto animate-fade-in-up stagger-1 leading-relaxed">
        {$_('hero.subtitle')}
      </p>

      <!-- Feature Tags -->
      <div class="flex flex-wrap justify-center gap-3 mb-10 animate-fade-in-up stagger-2">
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success-50 dark:bg-success-500/10 border border-success-200 dark:border-success-500/30">
          <Icon name="clock" size={16} class={"text-success-600"} />
          <span class="text-sm font-medium text-success-700 dark:text-success-400">{$_('hero.features.scan')}</span>
        </div>
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-info-50 dark:bg-info-500/10 border border-info-200 dark:border-info-500/30">
          <Icon name="shield-check" size={16} class={"text-info-600"} />
          <span class="text-sm font-medium text-info-700 dark:text-info-400">{$_('hero.features.security')}</span>
        </div>
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-50 dark:bg-accent-500/10 border border-accent-200 dark:border-accent-500/30">
          <Icon name="search" size={16} class={"text-accent-600"} />
          <span class="text-sm font-medium text-accent-700 dark:text-accent-400">{$_('hero.features.semantic')}</span>
        </div>
      </div>

      <!-- Search Box -->
      <form action="/search" method="get" class="max-w-2xl mx-auto animate-fade-in-up stagger-3">
        <div class="relative group">
          <div class="absolute -inset-1 bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500 rounded-2xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity"></div>
          <div class="relative flex items-center">
            <div class="absolute left-5 text-gray-400">
              <Icon name="search" size={22} />
            </div>
            <input
              type="text"
              name="q"
              placeholder={$_('hero.searchPlaceholder')}
              class="input input-lg pl-14 pr-32 rounded-xl shadow-lg border-gray-200/50 dark:border-neutral-700/50 bg-white dark:bg-neutral-900"
            />
            <button
              type="submit"
              class="absolute right-2 btn-primary btn-md rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              {$_('common.search')}
              <Icon name="arrow-right" size={16} />
            </button>
          </div>
        </div>
      </form>

      <!-- Quick tags -->
      <div class="mt-6 flex flex-wrap justify-center gap-2 animate-fade-in-up stagger-4">
        <span class="text-sm text-gray-500 dark:text-gray-500">{$_('hero.popular')}</span>
        {#each ['pdf', 'git', 'react', 'api', 'testing'] as tag}
          <a
            href="/search?q={tag}"
            class="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            {tag}
          </a>
        {/each}
      </div>
    </div>
  </div>

  <!-- Decorative elements -->
  <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-neutral-800 to-transparent"></div>
</section>

<!-- Categories Section -->
<section class="section bg-gray-50 dark:bg-neutral-900/50">
  <div class="container">
    <div class="flex items-end justify-between mb-8">
      <div>
        <h2 class="section-title">{$_('categories.title')}</h2>
        <p class="section-subtitle">{$_('categories.subtitle')}</p>
      </div>
      <a href="/search" class="hidden sm:flex btn-ghost btn-sm text-primary-600">
        {$_('common.viewAll')}
        <Icon name="arrow-right" size={16} />
      </a>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {#each data.categories as category, i}
        <a
          href="/category/{category.key}"
          class="group relative p-5 bg-white dark:bg-neutral-900 rounded-xl border border-gray-200/80 dark:border-neutral-800 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-lg transition-all card-hover"
          style="animation-delay: {i * 50}ms"
        >
          <!-- Accent line -->
          <div class="absolute top-0 left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-primary-500/0 group-hover:via-primary-500 to-transparent transition-all"></div>

          <div class="flex flex-col items-start">
            <div class="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 mb-3 group-hover:scale-110 transition-transform">
              <Icon name={categoryIcons[category.key] || 'tag'} size={20} />
            </div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-1">{getCategoryLabel(category, currentLang)}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-500 line-clamp-1">{getCategoryHint(category, currentLang)}</p>
            {#if category.count}
              <p class="mt-2 text-2xs font-medium text-primary-600 dark:text-primary-400">{category.count} skills</p>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  </div>
</section>

<!-- Featured Skills -->
{#if data.featured.length > 0}
  <section class="section">
    <div class="container">
      <div class="flex items-end justify-between mb-8">
        <div>
          <h2 class="section-title">{$_('featured.title')}</h2>
          <p class="section-subtitle">{$_('featured.subtitle')}</p>
        </div>
        <a href="/search?sort=stars" class="hidden sm:flex btn-ghost btn-sm text-primary-600">
          {$_('common.viewAll')}
          <Icon name="arrow-right" size={16} />
        </a>
      </div>

      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each data.featured as skill, i}
          <div class="animate-fade-in-up" style="animation-delay: {i * 100}ms">
            <SkillCard {skill} />
          </div>
        {/each}
      </div>
    </div>
  </section>
{/if}

<!-- Popular Tags Cloud -->
{#if data.summary.top_tags && data.summary.top_tags.length > 0}
  <section class="section bg-gray-50 dark:bg-neutral-900/50">
    <div class="container">
      <div class="max-w-3xl mx-auto text-center">
        <h2 class="section-title mb-4">{$_('trending.title')}</h2>
        <p class="section-subtitle mb-8">{$_('trending.subtitle')}</p>

        <div class="flex flex-wrap justify-center gap-3">
          {#each data.summary.top_tags.slice(0, 24) as item, i}
            <a
              href="/search?q={encodeURIComponent(item.tag)}"
              class="group inline-flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-primary-300 dark:hover:border-primary-700 hover:text-primary-600 dark:hover:text-primary-400 hover:shadow-md transition-all"
              style="animation-delay: {i * 30}ms"
            >
              <span>{item.tag}</span>
              <span class="text-2xs text-gray-400 dark:text-gray-500 group-hover:text-primary-400">
                {item.count}
              </span>
            </a>
          {/each}
        </div>
      </div>
    </div>
  </section>
{/if}

<!-- MCP Installation Section -->
<section class="section bg-gradient-to-br from-gray-900 via-gray-800 to-neutral-900 text-white overflow-hidden">
  <div class="container">
    <div class="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
      <!-- Left: Content -->
      <div>
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/20 border border-primary-500/30 text-primary-300 text-sm font-medium mb-6">
          <Icon name="package" size={14} />
          MCP Server
        </div>
        <h2 class="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6 tracking-tight">
          {$_('mcp.title')}
        </h2>
        <p class="text-lg text-gray-300 mb-10 leading-relaxed">
          {$_('mcp.subtitle')}
        </p>

        <!-- Features -->
        <div class="space-y-6 mb-10">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Icon name="package" size={20} class={"text-primary-400"} />
            </div>
            <div>
              <h4 class="font-semibold text-white text-lg">{$_('mcp.feature1Title')}</h4>
              <p class="text-gray-400 mt-1">{$_('mcp.feature1Desc')}</p>
            </div>
          </div>
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center">
              <Icon name="star" size={20} class={"text-accent-400"} />
            </div>
            <div>
              <h4 class="font-semibold text-white text-lg">{$_('mcp.feature2Title')}</h4>
              <p class="text-gray-400 mt-1">{$_('mcp.feature2Desc')}</p>
            </div>
          </div>
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-success-500/20 flex items-center justify-center">
              <Icon name="folder" size={20} class={"text-success-400"} />
            </div>
            <div>
              <h4 class="font-semibold text-white text-lg">{$_('mcp.feature3Title')}</h4>
              <p class="text-gray-400 mt-1">{$_('mcp.feature3Desc')}</p>
            </div>
          </div>
        </div>

        <a href="/docs/mcp" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 font-medium transition-colors">
          {$_('mcp.learnMore')}
          <Icon name="arrow-right" size={16} />
        </a>
      </div>

      <!-- Right: Install Command -->
      <div class="relative">
        <div class="absolute -inset-8 bg-gradient-to-r from-primary-500/20 via-accent-500/20 to-primary-500/20 rounded-3xl blur-2xl"></div>
        <div class="relative bg-gray-950 rounded-2xl border border-gray-700/50 overflow-hidden shadow-2xl">
          <div class="flex items-center justify-between px-4 py-3 bg-gray-900/80 border-b border-gray-700/50">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div class="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div class="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            <span class="text-xs text-gray-500 font-mono">{$_('mcp.installTitle')}</span>
            <div class="w-12"></div>
          </div>
          <div class="p-8">
            <div class="flex items-center justify-between gap-4">
              <code class="text-xl font-mono text-green-400">
                <span class="text-gray-500">$</span> npx shareskill
              </code>
              <button
                onclick={copyMcpCommand}
                class="flex-shrink-0 p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                aria-label="Copy command"
              >
                {#if mcpCopied}
                  <Icon name="check" size={20} class={"text-success-400"} />
                {:else}
                  <Icon name="copy" size={20} class={"text-gray-400"} />
                {/if}
              </button>
            </div>
            <div class="mt-6 pt-6 border-t border-gray-800">
              <p class="text-sm text-gray-500 flex items-center gap-2">
                <Icon name="shield-check" size={14} class={"text-gray-600"} />
                Works with Claude Code, Cursor, Windsurf, Codex, Gemini, and any MCP-compatible agent.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- CTA Section - Hidden for now, feature not ready
<section class="section">
  <div class="container">
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600 p-10 md:p-16">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute inset-0 grid-pattern"></div>
      </div>

      <div class="relative max-w-2xl mx-auto text-center">
        <h2 class="text-3xl md:text-4xl font-display font-bold text-white mb-4">
          {$_('cta.title')}
        </h2>
        <p class="text-lg text-white/80 mb-8">
          {$_('cta.subtitle')}
        </p>
        <a
          href="https://github.com/shareAI-lab/shareskill#submit-your-skill"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
        >
          <Icon name="github" size={20} />
          {$_('cta.submitSkill')}
        </a>
      </div>
    </div>
  </div>
</section>
-->
