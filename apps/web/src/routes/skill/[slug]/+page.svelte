<script lang="ts">
  import type { PageData } from './$types';
  import SkillCard from '$components/skill/SkillCard.svelte';
  import { Icon } from '$components/ui';
  import { _, locale } from 'svelte-i18n';
  import { getSkillTagline, getSkillDescription, getSkillKeyFeatures } from '$lib/utils/translations';

  let { data }: { data: PageData } = $props();

  let copied = $state(false);
  let warningsExpanded = $state(false);

  // Get current locale for translations
  const currentLocale = $derived($locale?.split('-')[0] || 'en');

  // Translated skill content
  const translatedTagline = $derived(getSkillTagline(data.skill, currentLocale));
  const translatedDescription = $derived(getSkillDescription(data.skill, currentLocale));
  const translatedKeyFeatures = $derived(getSkillKeyFeatures(data.skill, currentLocale));

  function copyCommand() {
    navigator.clipboard.writeText(`npx shareskill install ${data.skill.skill_key}`);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  const highWarnings = $derived(data.skill.security_warnings.filter(w => w.severity === 'high'));
  const mediumWarnings = $derived(data.skill.security_warnings.filter(w => w.severity === 'medium'));
  const lowWarnings = $derived(data.skill.security_warnings.filter(w => w.severity === 'low'));
  const hasWarnings = $derived(data.skill.security_warnings.length > 0);
  const totalWarnings = $derived(data.skill.security_warnings.length);

  const warningTypeKeys: Record<string, string> = {
    prompt_injection: 'promptInjection',
    malicious_code: 'maliciousCode',
    data_exfiltration: 'dataExfiltration',
    credential_exposure: 'credentialExposure',
    destructive_operation: 'destructiveOperation',
    other: 'other',
  };

  // Get translated security warning descriptions
  const translatedWarningDescriptions = $derived(() => {
    if (currentLocale !== 'en' && data.skill.translations?.[currentLocale]?.security_warnings) {
      return data.skill.translations[currentLocale].security_warnings as string[];
    }
    return null;
  });

  function getWarningDescription(index: number, originalDescription: string): string {
    const translated = translatedWarningDescriptions();
    if (translated && translated[index]) {
      return translated[index];
    }
    return originalDescription;
  }

  const visibleWarnings = $derived(
    warningsExpanded ? data.skill.security_warnings : data.skill.security_warnings.slice(0, 3)
  );

  const filteredFileTree = $derived(
    (data.skill.file_tree || []).filter(item => {
      if (item.path === data.skill.skill_path) return false;
      return true;
    })
  );

  const displayName = $derived(data.skill.skill_slug || data.skill.name || data.skill.skill_key.split(':')[1]);
</script>

<svelte:head>
  <title>{$_('meta.skillTitle', { values: { name: displayName } })}</title>
  <meta name="description" content={data.skill.tagline} />
</svelte:head>

<!-- Breadcrumb -->
<div class="border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/50">
  <div class="container py-3">
    <nav class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      <a href="/" class="hover:text-primary-600 transition-colors">{$_('common.home')}</a>
      <Icon name="chevron-right" size={14} />
      <a href="/category/{data.skill.category}" class="hover:text-primary-600 transition-colors capitalize">{$_(`categories.${data.skill.category}`) || data.skill.category}</a>
      <Icon name="chevron-right" size={14} />
      <span class="text-gray-900 dark:text-white font-medium truncate">{displayName}</span>
    </nav>
  </div>
</div>

<div class="container py-8 md:py-12">
  <div class="grid lg:grid-cols-3 gap-8">
    <!-- Main Content -->
    <div class="lg:col-span-2 space-y-8">
      <!-- Header -->
      <header>
        <div class="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 class="text-3xl md:text-4xl font-display font-bold text-gray-900 dark:text-white">
              {displayName}
            </h1>
            <p class="text-lg text-gray-600 dark:text-gray-400 mt-2">
              {translatedTagline}
            </p>
          </div>
          <div class="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg font-medium">
            <Icon name="star-fill" size={18} class={"text-amber-400"} />
            {data.skill.repo_stars.toLocaleString()}
          </div>
        </div>

        <!-- Tags -->
        <div class="flex flex-wrap items-center gap-2">
          <a href="/category/{data.skill.category}" class="badge-primary">
            {$_(`categories.${data.skill.category}`) || data.skill.category}
          </a>
          {#each data.skill.tags.slice(0, 5) as tag}
            <span class="badge-neutral">{tag}</span>
          {/each}
        </div>
      </header>

      <!-- Security Warnings -->
      {#if hasWarnings}
        <section class="rounded-xl border-2 overflow-hidden {highWarnings.length > 0 ? 'bg-danger-50 dark:bg-danger-500/5 border-danger-200 dark:border-danger-500/30' : mediumWarnings.length > 0 ? 'bg-warning-50 dark:bg-warning-500/5 border-warning-200 dark:border-warning-500/30' : 'bg-info-50 dark:bg-info-500/5 border-info-200 dark:border-info-500/30'}">
          <div class="p-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center {highWarnings.length > 0 ? 'bg-danger-100 dark:bg-danger-500/20' : mediumWarnings.length > 0 ? 'bg-warning-100 dark:bg-warning-500/20' : 'bg-info-100 dark:bg-info-500/20'}">
                <Icon name="shield-alert" size={20} class={highWarnings.length > 0 ? 'text-danger-600' : mediumWarnings.length > 0 ? 'text-warning-600' : 'text-info-600'} />
              </div>
              <div class="flex-1">
                <h2 class="font-semibold text-gray-900 dark:text-white">{$_('security.analysisTitle')}</h2>
                <p class="text-sm text-gray-600 dark:text-gray-400">{$_('security.reviewBefore')}</p>
              </div>
              <div class="flex gap-2">
                {#if highWarnings.length > 0}
                  <span class="badge-danger">{highWarnings.length} {$_('security.critical')}</span>
                {/if}
                {#if mediumWarnings.length > 0}
                  <span class="badge-warning">{mediumWarnings.length} {$_('security.warning')}</span>
                {/if}
                {#if lowWarnings.length > 0}
                  <span class="badge-info">{lowWarnings.length} {$_('security.info')}</span>
                {/if}
              </div>
            </div>

            <div class="space-y-3">
              {#each visibleWarnings as warning, idx}
                {@const warningIndex = warningsExpanded ? idx : idx}
                {@const allWarningsIndex = data.skill.security_warnings.indexOf(warning)}
                <div class="p-4 bg-white dark:bg-neutral-900 rounded-lg border {warning.severity === 'high' ? 'border-danger-200 dark:border-danger-500/30' : warning.severity === 'medium' ? 'border-warning-200 dark:border-warning-500/30' : 'border-info-200 dark:border-info-500/30'}">
                  <div class="flex items-start gap-3">
                    <div class="flex-shrink-0 mt-0.5">
                      {#if warning.severity === 'high'}
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-danger-100 dark:bg-danger-500/20 text-danger-600">
                          <Icon name="x" size={14} />
                        </span>
                      {:else if warning.severity === 'medium'}
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-warning-100 dark:bg-warning-500/20 text-warning-600">
                          <Icon name="warning" size={14} />
                        </span>
                      {:else}
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-info-100 dark:bg-info-500/20 text-info-600">
                          <Icon name="info" size={14} />
                        </span>
                      {/if}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-semibold uppercase {warning.severity === 'high' ? 'text-danger-600' : warning.severity === 'medium' ? 'text-warning-600' : 'text-info-600'}">
                          {$_(`security.severity.${warning.severity}`)}
                        </span>
                        {#if warning.type && warning.type !== 'other'}
                          <span class="badge-neutral text-2xs">
                            {$_(`security.types.${warningTypeKeys[warning.type] || 'other'}`)}
                          </span>
                        {/if}
                      </div>
                      <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{getWarningDescription(allWarningsIndex, warning.description)}</p>
                      <div class="mt-2 flex items-center gap-1 text-xs font-mono text-gray-500 dark:text-gray-500">
                        <Icon name="file" size={12} />
                        {warning.file}{warning.line ? `:${warning.line}` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>

            {#if totalWarnings > 3}
              <button
                onclick={() => warningsExpanded = !warningsExpanded}
                class="mt-4 w-full btn-ghost btn-sm justify-center"
              >
                {warningsExpanded ? $_('common.showLess') : `${$_('common.showMore')} (${totalWarnings - 3})`}
                <Icon name={warningsExpanded ? 'chevron-up' : 'chevron-down'} size={16} />
              </button>
            {/if}
          </div>
        </section>
      {:else}
        <section class="rounded-xl border border-success-200 dark:border-success-500/30 bg-success-50 dark:bg-success-500/5 p-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-success-100 dark:bg-success-500/20 flex items-center justify-center">
              <Icon name="shield-check" size={20} class={"text-success-600"} />
            </div>
            <div>
              <h2 class="font-semibold text-gray-900 dark:text-white">{$_('security.passed')}</h2>
              <p class="text-sm text-gray-600 dark:text-gray-400">{$_('security.noWarnings')}</p>
            </div>
          </div>
        </section>
      {/if}

      <!-- Description -->
      <section>
        <h2 class="section-title mb-4">{$_('skill.about')}</h2>
        <p class="text-gray-600 dark:text-gray-400 leading-relaxed">
          {translatedDescription}
        </p>
      </section>

      <!-- Key Features -->
      {#if translatedKeyFeatures.length > 0}
        <section>
          <h2 class="section-title mb-4">{$_('skill.keyFeatures')}</h2>
          <div class="grid sm:grid-cols-2 gap-3">
            {#each translatedKeyFeatures as feature}
              <div class="flex items-start gap-3 p-4 bg-gray-50 dark:bg-neutral-900 rounded-lg">
                <div class="flex-shrink-0 w-6 h-6 rounded-full bg-success-100 dark:bg-success-500/20 flex items-center justify-center">
                  <Icon name="check" size={14} class={"text-success-600"} />
                </div>
                <span class="text-gray-700 dark:text-gray-300">{feature}</span>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <!-- Tech Stack -->
      {#if data.skill.tech_stack && data.skill.tech_stack.length > 0}
        <section>
          <h2 class="section-title mb-4">{$_('skill.techStack')}</h2>
          <div class="flex flex-wrap gap-2">
            {#each data.skill.tech_stack as tech}
              <span class="badge-accent">{tech}</span>
            {/each}
          </div>
        </section>
      {/if}

      <!-- File Tree -->
      {#if filteredFileTree.length > 0 || data.skill.skill_md_content}
        <section>
          <h2 class="section-title mb-4">{$_('skill.packageContents')}</h2>
          <div class="bg-gray-50 dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
            <div class="p-4 space-y-1 font-mono text-sm">
              {#if data.skill.skill_md_content}
                <div class="flex items-center gap-2 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <Icon name="file" size={16} class={"text-primary-500 flex-shrink-0"} />
                  <span class="truncate font-medium">SKILL.md</span>
                  <span class="ml-auto text-xs text-gray-400">{(data.skill.skill_md_content.length / 1024).toFixed(1)}KB</span>
                </div>
              {/if}
              {#each filteredFileTree as item}
                <div class="flex items-center gap-2 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  {#if item.type === 'dir'}
                    <Icon name="folder" size={16} class={"text-amber-500 flex-shrink-0"} />
                  {:else}
                    <Icon name="file" size={16} class={"text-gray-400 flex-shrink-0"} />
                  {/if}
                  <span class="truncate">{item.path}</span>
                  {#if item.size}
                    <span class="ml-auto text-xs text-gray-400">{(item.size / 1024).toFixed(1)}KB</span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        </section>
      {/if}

      <!-- Related Skills -->
      {#if data.skill.related && data.skill.related.length > 0}
        <section>
          <h2 class="section-title mb-4">{$_('skill.relatedSkills')}</h2>
          <div class="grid sm:grid-cols-2 gap-4">
            {#each data.skill.related as related}
              <SkillCard skill={related} compact />
            {/each}
          </div>
        </section>
      {/if}

      <!-- Same Repo Skills -->
      {#if data.skill.same_repo && data.skill.same_repo.length > 0}
        <section class="p-6 bg-accent-50 dark:bg-accent-900/10 rounded-xl border border-accent-200 dark:border-accent-500/30">
          <div class="flex items-center gap-2 mb-4">
            <Icon name="package" size={20} class={"text-accent-600"} />
            <h2 class="font-semibold text-gray-900 dark:text-white">
              {$_('skill.moreFrom', { values: { repo: data.skill.repo_full_name } })}
            </h2>
            <span class="badge-accent text-2xs">
              {data.skill.same_repo.length} skill{data.skill.same_repo.length > 1 ? 's' : ''}
            </span>
          </div>
          <div class="grid sm:grid-cols-2 gap-3">
            {#each data.skill.same_repo as skill}
              {@const sameRepoTagline = currentLocale !== 'en' && skill.translations?.[currentLocale]?.tagline ? skill.translations[currentLocale].tagline : skill.tagline}
              <a
                href="/skill/{encodeURIComponent(skill.skill_key)}"
                class="block p-4 bg-white dark:bg-neutral-900 rounded-lg border border-accent-200 dark:border-accent-500/20 hover:border-accent-400 dark:hover:border-accent-500/50 hover:shadow-md transition-all"
              >
                <div class="font-medium text-gray-900 dark:text-white mb-1">
                  {skill.skill_slug || skill.name || skill.skill_key.split(':')[1]}
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{sameRepoTagline}</p>
                <div class="flex items-center gap-2 mt-2">
                  <span class="badge-neutral text-2xs">{$_(`categories.${skill.category}`) || skill.category}</span>
                </div>
              </a>
            {/each}
          </div>
        </section>
      {/if}
    </div>

    <!-- Sidebar -->
    <aside class="lg:col-span-1">
      <div class="sticky top-24 space-y-6">
        <!-- Install Card -->
        <div class="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-6 shadow-sm">
          <h3 class="font-semibold text-gray-900 dark:text-white mb-4">{$_('skill.installation')}</h3>
          <div class="space-y-3">
            <div class="relative">
              <code class="block w-full px-4 py-3 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg font-mono text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
                npx shareskill install {data.skill.skill_key}
              </code>
              <button
                onclick={copyCommand}
                class="absolute right-2 top-1/2 -translate-y-1/2 btn-ghost btn-icon"
                aria-label="Copy command"
              >
                {#if copied}
                  <Icon name="check" size={16} class={"text-success-500"} />
                {:else}
                  <Icon name="copy" size={16} />
                {/if}
              </button>
            </div>
            <button
              onclick={copyCommand}
              class="w-full btn-primary btn-md"
            >
              {copied ? $_('common.copied') : $_('common.copyCommand')}
            </button>
          </div>
        </div>

        <!-- Links -->
        <div class="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-6 shadow-sm">
          <h3 class="font-semibold text-gray-900 dark:text-white mb-4">{$_('skill.links')}</h3>
          <div class="space-y-2">
            <a
              href="https://github.com/{data.skill.repo_full_name}"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <Icon name="github" size={20} class={"text-gray-600 dark:text-gray-400"} />
              <span class="text-gray-700 dark:text-gray-300">{$_('skill.viewOnGithub')}</span>
              <Icon name="external-link" size={14} class={"ml-auto text-gray-400"} />
            </a>
            {#if data.skill.download_url}
              <a
                href={data.skill.download_url}
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <Icon name="folder" size={20} class={"text-gray-600 dark:text-gray-400"} />
                <span class="text-gray-700 dark:text-gray-300">{$_('skill.browseFiles')}</span>
                <Icon name="external-link" size={14} class={"ml-auto text-gray-400"} />
              </a>
            {/if}
          </div>
        </div>

        <!-- Metadata -->
        <div class="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-6 shadow-sm">
          <h3 class="font-semibold text-gray-900 dark:text-white mb-4">{$_('skill.details')}</h3>
          <dl class="space-y-3 text-sm">
            {#if data.skill.license}
              <div class="flex justify-between">
                <dt class="text-gray-500 dark:text-gray-500">{$_('skill.license')}</dt>
                <dd class="text-gray-900 dark:text-white font-medium">{data.skill.license}</dd>
              </div>
            {/if}
            {#if data.skill.compatibility}
              <div class="flex justify-between">
                <dt class="text-gray-500 dark:text-gray-500">{$_('skill.compatibility')}</dt>
                <dd class="text-gray-900 dark:text-white font-medium">{data.skill.compatibility}</dd>
              </div>
            {/if}
            {#if data.skill.total_files > 0}
              <div class="flex justify-between">
                <dt class="text-gray-500 dark:text-gray-500">{$_('skill.files')}</dt>
                <dd class="text-gray-900 dark:text-white font-medium">{data.skill.total_files}</dd>
              </div>
            {/if}
            {#if data.skill.has_scripts}
              <div class="flex justify-between">
                <dt class="text-gray-500 dark:text-gray-500">{$_('skill.scripts')}</dt>
                <dd class="text-gray-900 dark:text-white font-medium">{data.skill.script_count}</dd>
              </div>
            {/if}
            <div class="flex justify-between">
              <dt class="text-gray-500 dark:text-gray-500">{$_('skill.repository')}</dt>
              <dd class="text-gray-900 dark:text-white font-medium truncate max-w-32">{data.skill.repo_full_name}</dd>
            </div>
          </dl>
        </div>
      </div>
    </aside>
  </div>
</div>
