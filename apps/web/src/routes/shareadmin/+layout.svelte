<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import type { LayoutData } from './$types';

  let { children, data }: { children: any; data: LayoutData } = $props();

  const navItems = [
    { href: '/shareadmin', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/shareadmin/skills', label: 'Skills', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { href: '/shareadmin/analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { href: '/shareadmin/security', label: 'Security', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  ];

  function isActive(href: string, pathname: string): boolean {
    if (href === '/shareadmin') {
      return pathname === '/shareadmin';
    }
    return pathname.startsWith(href);
  }

  const isLoginPage = $derived($page.url.pathname === '/shareadmin/login');

  function handleNavClick(e: MouseEvent, href: string) {
    e.preventDefault();
    goto(href);
  }

  async function handleLogout() {
    await fetch('/shareadmin/logout', { method: 'POST' });
    goto('/shareadmin/login');
  }
</script>

{#if isLoginPage}
  {@render children()}
{:else}
  <div class="flex min-h-screen bg-gray-50">
    <!-- Sidebar -->
    <aside class="w-64 bg-gradient-to-b from-admin-900 via-admin-800 to-admin-900 text-white flex-shrink-0 flex flex-col shadow-xl">
      <!-- Logo -->
      <div class="p-5 border-b border-admin-700/50">
        <a href="/shareadmin" class="flex items-center gap-3" onclick={(e) => handleNavClick(e, '/shareadmin')}>
          <div class="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur">
            <svg class="w-5 h-5 text-admin-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div class="font-bold text-lg tracking-tight">ShareSkill</div>
            <div class="text-[10px] text-admin-300 uppercase tracking-wider font-medium">Admin Panel</div>
          </div>
        </a>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-4 space-y-1">
        {#each navItems as item}
          {@const active = isActive(item.href, $page.url.pathname)}
          <a
            href={item.href}
            onclick={(e) => handleNavClick(e, item.href)}
            class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group {active
              ? 'bg-white/15 text-white shadow-lg shadow-admin-900/20'
              : 'text-admin-200 hover:bg-white/10 hover:text-white'}"
          >
            <svg class="w-5 h-5 {active ? 'text-admin-300' : 'text-admin-400 group-hover:text-admin-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={item.icon} />
            </svg>
            <span class="font-medium text-sm">{item.label}</span>
            {#if active}
              <div class="ml-auto w-1.5 h-1.5 bg-admin-400 rounded-full"></div>
            {/if}
          </a>
        {/each}
      </nav>

      <!-- Footer -->
      <div class="p-4 border-t border-admin-700/50 space-y-2">
        <a
          href="/"
          class="flex items-center gap-2 px-4 py-2 text-admin-300 hover:text-white text-sm transition-colors rounded-lg hover:bg-white/5"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Site</span>
        </a>
        <button
          onclick={handleLogout}
          class="w-full flex items-center gap-2 px-4 py-2 text-admin-400 hover:text-white text-sm transition-colors rounded-lg hover:bg-white/5"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto">
      <div class="p-8">
        {@render children()}
      </div>
    </main>
  </div>
{/if}
