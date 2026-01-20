<script lang="ts">
  import { locale, supportedLocales, setLocale } from '$lib/i18n';
  import { Icon } from '$components/ui';

  let isOpen = $state(false);

  const currentLocale = $derived(supportedLocales.find(l => l.code === $locale) || supportedLocales[0]);

  function handleSelect(code: string) {
    setLocale(code);
    isOpen = false;
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.locale-switcher')) {
      isOpen = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="locale-switcher relative">
  <button
    onclick={() => isOpen = !isOpen}
    class="btn-ghost btn-sm flex items-center gap-1.5"
    aria-label="Change language"
  >
    <Icon name="globe" size={16} />
    <span class="hidden sm:inline">{currentLocale.nativeName}</span>
    <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} />
  </button>

  {#if isOpen}
    <div class="absolute right-0 top-full mt-1 py-1 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-lg z-50 min-w-32 animate-fade-in">
      {#each supportedLocales as loc}
        <button
          onclick={() => handleSelect(loc.code)}
          class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-between gap-2 {loc.code === $locale ? 'text-primary-600 font-medium' : 'text-gray-700 dark:text-gray-300'}"
        >
          <span>{loc.nativeName}</span>
          <span class="text-xs text-gray-400">{loc.name}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>
