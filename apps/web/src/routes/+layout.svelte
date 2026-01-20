<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { Icon, LocaleSwitcher } from '$components/ui';
  import { initI18n, getStoredLocale, setLocale } from '$lib/i18n';
  import { onMount } from 'svelte';
  import { _, isLoading } from 'svelte-i18n';

  interface Props {
    children: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  const isAdminRoute = $derived($page.url.pathname.startsWith('/shareadmin'));

  // Mobile menu state
  let mobileMenuOpen = $state(false);

  // Initialize i18n
  initI18n();

  onMount(() => {
    // Restore stored locale preference
    const stored = getStoredLocale();
    if (stored) {
      setLocale(stored);
    }
  });
</script>

{#if $isLoading}
  <div class="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
    <div class="animate-pulse text-gray-400">Loading...</div>
  </div>
{:else if isAdminRoute}
  {@render children()}
{:else}
  <div class="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
    <!-- Header with glass effect -->
    <header class="sticky top-0 z-50 glass border-b border-gray-200/50 dark:border-neutral-800/50">
      <div class="container py-4">
        <div class="flex items-center justify-between">
          <!-- Logo -->
          <a href="/" class="flex items-center gap-2 group">
            <span class="text-2xl font-display font-bold">
              <span class="text-gray-900 dark:text-white">share</span><span class="gradient-text">Skill</span>
            </span>
          </a>

          <!-- Desktop Navigation -->
          <nav class="hidden md:flex items-center gap-1">
            <a
              href="/search"
              class="btn-ghost btn-sm"
            >
              <Icon name="search" size={16} />
              <span>{$_('common.explore')}</span>
            </a>
            <a
              href="https://github.com/shareAI-lab/shareskill"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-ghost btn-sm"
            >
              <Icon name="github" size={16} />
              <span>{$_('common.github')}</span>
            </a>
            <div class="w-px h-5 bg-gray-200 dark:bg-neutral-700 mx-2"></div>
            <LocaleSwitcher />
            <a
              href="/docs/mcp"
              class="btn-outline btn-sm"
            >
              MCP
            </a>
          </nav>

          <!-- Mobile menu button -->
          <div class="flex items-center gap-2 md:hidden">
            <LocaleSwitcher />
            <button
              class="btn-ghost btn-icon"
              onclick={() => mobileMenuOpen = !mobileMenuOpen}
              aria-label="Toggle menu"
            >
              {#if mobileMenuOpen}
                <Icon name="x" size={24} />
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              {/if}
            </button>
          </div>
        </div>

        <!-- Mobile menu -->
        {#if mobileMenuOpen}
          <nav class="md:hidden mt-4 pb-2 border-t border-gray-200 dark:border-neutral-800 pt-4 animate-fade-in">
            <div class="flex flex-col gap-2">
              <a
                href="/search"
                class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800"
                onclick={() => mobileMenuOpen = false}
              >
                <Icon name="search" size={18} />
                {$_('nav.exploreSkills')}
              </a>
              <a
                href="https://github.com/shareAI-lab/shareskill"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800"
              >
                <Icon name="github" size={18} />
                {$_('common.github')}
              </a>
              <a
                href="/docs/mcp"
                class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800"
              >
                <Icon name="file" size={18} />
                MCP
              </a>
            </div>
          </nav>
        {/if}
      </div>
    </header>

    <main class="flex-1">
      {@render children()}
    </main>

    <!-- Footer -->
    <footer class="border-t border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900">
      <div class="container py-12">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <!-- Brand -->
          <div class="col-span-2 md:col-span-1">
            <a href="/" class="text-xl font-display font-bold">
              <span class="text-gray-900 dark:text-white">share</span><span class="gradient-text">Skill</span>
            </a>
            <p class="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {$_('footer.tagline')}
            </p>
          </div>

          <!-- Resources -->
          <div>
            <h4 class="font-semibold text-gray-900 dark:text-white mb-3">{$_('footer.resources')}</h4>
            <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li><a href="/search" class="hover:text-primary-600 transition-colors">{$_('footer.exploreSkills')}</a></li>
              <li><a href="/docs/mcp" class="hover:text-primary-600 transition-colors">MCP</a></li>
              <li><a href="https://spec.skills.ai" target="_blank" rel="noopener" class="hover:text-primary-600 transition-colors">{$_('footer.agentSkillsSpec')}</a></li>
            </ul>
          </div>

          <!-- Community -->
          <div>
            <h4 class="font-semibold text-gray-900 dark:text-white mb-3">{$_('footer.community')}</h4>
            <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <a href="https://github.com/shareAI-lab/shareskill" target="_blank" rel="noopener" class="hover:text-primary-600 transition-colors inline-flex items-center gap-1">
                  <Icon name="github" size={14} />
                  {$_('common.github')}
                </a>
              </li>
              <li>
                <a href="https://github.com/shareAI-lab/shareskill/issues" target="_blank" rel="noopener" class="hover:text-primary-600 transition-colors">
                  {$_('footer.reportIssues')}
                </a>
              </li>
            </ul>
          </div>

          <!-- Submit - Hidden for now, feature not ready
          <div>
            <h4 class="font-semibold text-gray-900 dark:text-white mb-3">{$_('footer.contribute')}</h4>
            <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li><a href="https://github.com/shareAI-lab/shareskill#submit-your-skill" target="_blank" rel="noopener" class="hover:text-primary-600 transition-colors">{$_('footer.submitSkill')}</a></li>
              <li><a href="https://github.com/shareAI-lab/shareskill#contributing" target="_blank" rel="noopener" class="hover:text-primary-600 transition-colors">{$_('footer.contributingGuide')}</a></li>
            </ul>
          </div>
          -->
        </div>

        <div class="mt-10 pt-6 border-t border-gray-200 dark:border-neutral-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p class="text-sm text-gray-500 dark:text-gray-500">
            {$_('footer.openSource')}
          </p>
          <div class="flex items-center gap-4 text-sm text-gray-500">
            <a href="https://github.com/shareAI-lab/shareskill" target="_blank" rel="noopener" class="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              <Icon name="github" size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  </div>
{/if}
