<script lang="ts">
  import type { SkillListItem } from '@shareskill/shared';
  import { Icon } from '$components/ui';
  import { locale } from 'svelte-i18n';

  interface Props {
    skill: SkillListItem;
    compact?: boolean;
  }

  let { skill, compact = false }: Props = $props();

  const currentLang = $derived($locale?.split('-')[0] || 'en');

  function formatStars(stars: number): string {
    if (stars >= 1000) {
      return `${(stars / 1000).toFixed(1)}k`;
    }
    return stars.toString();
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  }

  const displayName = $derived(skill.skill_slug || skill.name || skill.skill_key.split(':')[1]);

  const displayTagline = $derived(() => {
    if (currentLang !== 'en' && skill.translations?.[currentLang]?.tagline) {
      return skill.translations[currentLang].tagline;
    }
    return skill.tagline || skill.description;
  });

  const displayFeatures = $derived(() => {
    if (currentLang !== 'en' && skill.translations?.[currentLang]?.key_features?.length) {
      return skill.translations[currentLang].key_features;
    }
    return skill.key_features;
  });
</script>

<a
  href="/skill/{encodeURIComponent(skill.skill_key)}"
  class="group block bg-white dark:bg-neutral-900 rounded-xl border border-gray-200/80 dark:border-neutral-800 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-lg transition-all duration-300 overflow-hidden"
  class:p-4={!compact}
  class:p-3={compact}
>
  <!-- Top accent line (appears on hover) -->
  <div class="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-accent-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>

  <div class="relative">
    <!-- Header -->
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
          {displayName}
        </h3>
        {#if !compact}
          <p class="text-xs text-gray-500 dark:text-gray-500 mt-0.5 truncate">
            {skill.repo_full_name}
          </p>
        {/if}
      </div>

      <!-- Stars badge -->
      {#if skill.repo_stars > 0}
        <div class="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg text-sm font-medium">
          <Icon name="star-fill" size={14} class="text-amber-400" />
          {formatStars(skill.repo_stars)}
        </div>
      {/if}
    </div>

    <!-- Description -->
    <p class="text-gray-600 dark:text-gray-400 text-sm mt-3 line-clamp-2 leading-relaxed">
      {displayTagline()}
    </p>

    <!-- Key features (non-compact mode) -->
    {#if !compact && displayFeatures() && displayFeatures()!.length > 0}
      <div class="flex flex-col gap-1.5 mt-4">
        {#each displayFeatures()!.slice(0, 2) as feature}
          <div class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Icon name="check" size={14} class="flex-shrink-0 mt-0.5 text-success-500" />
            <span class="line-clamp-1">{feature}</span>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Footer -->
    <div class="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-neutral-800">
      <div class="flex items-center gap-2">
        <span class="badge-primary text-2xs">
          {skill.category}
        </span>
        {#if skill.tags && skill.tags.length > 0 && !compact}
          {#each skill.tags.slice(0, 2) as tag}
            <span class="badge-neutral text-2xs hidden sm:inline-flex">
              {tag}
            </span>
          {/each}
        {/if}
      </div>

      {#if skill.repo_pushed_at}
        <span class="flex items-center gap-1 text-2xs text-gray-400 dark:text-gray-500">
          <Icon name="clock" size={12} />
          {formatDate(skill.repo_pushed_at)}
        </span>
      {/if}
    </div>
  </div>
</a>
