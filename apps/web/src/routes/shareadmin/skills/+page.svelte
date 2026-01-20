<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Derived values for reactive data access
  let skills = $derived(data.skills);
  let categories = $derived(data.categories);
  let pagination = $derived(data.pagination);
  let filters = $derived(data.filters);

  // Local state for form inputs
  let search = $state('');
  let category = $state('');
  let showFeatured = $state(false);
  let showFlagged = $state(false);
  let showWarnings = $state(false);

  // Sync local state with data filters on initial load and navigation
  $effect(() => {
    search = filters.search;
    category = filters.category;
    showFeatured = filters.featured;
    showFlagged = filters.flagged;
    showWarnings = filters.hasWarnings;
  });

  function applyFilters() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (showFeatured) params.set('featured', 'true');
    if (showFlagged) params.set('flagged', 'true');
    if (showWarnings) params.set('has_warnings', 'true');
    goto(`/shareadmin/skills?${params.toString()}`);
  }

  function clearFilters() {
    goto('/shareadmin/skills');
  }

  function goToPage(pageNum: number) {
    const params = new URLSearchParams($page.url.search);
    params.set('page', pageNum.toString());
    goto(`/shareadmin/skills?${params.toString()}`);
  }

  async function toggleFeature(skillId: number, currentState: boolean) {
    const method = currentState ? 'DELETE' : 'POST';
    const res = await fetch(`/api/shareadmin/skills/${skillId}/feature`, { method });
    if (res.ok) {
      await invalidateAll();
    } else {
      alert('Failed to update feature status');
    }
  }

  async function toggleFlag(skillId: number, currentState: boolean) {
    if (!currentState) {
      const reason = prompt('Enter flag reason:');
      if (!reason) return;
      const res = await fetch(`/api/shareadmin/skills/${skillId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        await invalidateAll();
      } else {
        alert('Failed to flag skill');
      }
    } else {
      const res = await fetch(`/api/shareadmin/skills/${skillId}/flag`, { method: 'DELETE' });
      if (res.ok) {
        await invalidateAll();
      } else {
        alert('Failed to unflag skill');
      }
    }
  }

  const hasActiveFilters = $derived(search || category || showFeatured || showFlagged || showWarnings);
</script>

<svelte:head>
  <title>Skills Management - ShareSkill Admin</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Skills Management</h1>
      <p class="text-sm text-gray-500 mt-1">Manage and moderate all skills in the registry</p>
    </div>
    <div class="text-sm text-gray-500">
      {pagination.total.toLocaleString()} skills total
    </div>
  </div>

  <!-- Filters -->
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
    <div class="flex flex-wrap gap-4 items-end">
      <!-- Search -->
      <div class="flex-1 min-w-[240px]">
        <label class="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Search</label>
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            bind:value={search}
            placeholder="Search by name, slug, or repo..."
            class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-admin-500 focus:border-transparent transition-shadow"
            onkeydown={(e) => e.key === 'Enter' && applyFilters()}
          />
        </div>
      </div>

      <!-- Category -->
      <div class="w-44">
        <label class="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Category</label>
        <select
          bind:value={category}
          class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-admin-500 focus:border-transparent bg-white"
        >
          <option value="">All Categories</option>
          {#each categories as cat}
            <option value={cat.key}>{cat.label}</option>
          {/each}
        </select>
      </div>

      <!-- Checkboxes -->
      <div class="flex items-center gap-5">
        <label class="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            bind:checked={showFeatured}
            class="w-4 h-4 rounded border-gray-300 text-admin-600 focus:ring-admin-500"
          />
          <span class="text-sm text-gray-600 group-hover:text-gray-900">Featured</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            bind:checked={showFlagged}
            class="w-4 h-4 rounded border-gray-300 text-admin-600 focus:ring-admin-500"
          />
          <span class="text-sm text-gray-600 group-hover:text-gray-900">Flagged</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            bind:checked={showWarnings}
            class="w-4 h-4 rounded border-gray-300 text-admin-600 focus:ring-admin-500"
          />
          <span class="text-sm text-gray-600 group-hover:text-gray-900">Has Warnings</span>
        </label>
      </div>

      <!-- Buttons -->
      <div class="flex gap-2">
        <button
          onclick={applyFilters}
          class="px-5 py-2.5 bg-admin-600 text-white rounded-lg text-sm font-medium hover:bg-admin-700 transition-colors shadow-sm"
        >
          Apply Filters
        </button>
        {#if hasActiveFilters}
          <button
            onclick={clearFilters}
            class="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        {/if}
      </div>
    </div>
  </div>

  <!-- Table -->
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="bg-gray-50 border-b border-gray-100">
            <th class="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Skill</th>
            <th class="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
            <th class="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stars</th>
            <th class="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Warnings</th>
            <th class="px-5 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#each skills as skill}
            <tr class="hover:bg-gray-50/50 transition-colors">
              <!-- Status -->
              <td class="px-5 py-4">
                <div class="flex items-center gap-2">
                  {#if skill.is_featured}
                    <span class="inline-flex items-center justify-center w-6 h-6 bg-yellow-100 rounded-full" title="Featured">
                      <svg class="w-3.5 h-3.5 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </span>
                  {/if}
                  {#if skill.is_flagged}
                    <span class="inline-flex items-center justify-center w-6 h-6 bg-red-100 rounded-full" title="Flagged: {skill.flag_reason}">
                      <svg class="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </span>
                  {/if}
                </div>
              </td>

              <!-- Skill Info -->
              <td class="px-5 py-4">
                <a
                  href="/skill/{encodeURIComponent(skill.skill_key)}"
                  class="group"
                  target="_blank"
                >
                  <div class="text-sm font-medium text-gray-900 group-hover:text-admin-600 transition-colors">
                    {skill.skill_slug || skill.name}
                  </div>
                  <div class="text-xs text-gray-500 mt-0.5">{skill.repo_full_name}</div>
                </a>
              </td>

              <!-- Category -->
              <td class="px-5 py-4">
                {#if skill.category}
                  <span class="inline-flex px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full capitalize">
                    {skill.category}
                  </span>
                {:else}
                  <span class="text-gray-400 text-sm">-</span>
                {/if}
              </td>

              <!-- Stars -->
              <td class="px-5 py-4">
                <div class="flex items-center gap-1.5 text-sm text-gray-600">
                  <svg class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  {skill.repo_stars?.toLocaleString() || 0}
                </div>
              </td>

              <!-- Warnings -->
              <td class="px-5 py-4">
                {#if skill.warning_count > 0}
                  <div class="flex items-center gap-1.5">
                    {#if skill.high_warning_count > 0}
                      <span class="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                        {skill.high_warning_count} high
                      </span>
                    {/if}
                    {#if skill.warning_count - skill.high_warning_count > 0}
                      <span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                        {skill.warning_count - skill.high_warning_count} other
                      </span>
                    {/if}
                  </div>
                {:else}
                  <span class="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Clean
                  </span>
                {/if}
              </td>

              <!-- Actions -->
              <td class="px-5 py-4">
                <div class="flex items-center justify-end gap-2">
                  <button
                    onclick={() => toggleFeature(skill.id, skill.is_featured)}
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors {skill.is_featured
                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
                  >
                    <svg class="w-3.5 h-3.5" fill={skill.is_featured ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {skill.is_featured ? 'Unfeature' : 'Feature'}
                  </button>
                  <button
                    onclick={() => toggleFlag(skill.id, skill.is_flagged)}
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors {skill.is_flagged
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                    {skill.is_flagged ? 'Unflag' : 'Flag'}
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
      <div class="text-sm text-gray-500">
        Showing <span class="font-medium text-gray-700">{(pagination.page - 1) * pagination.limit + 1}</span>
        to <span class="font-medium text-gray-700">{Math.min(pagination.page * pagination.limit, pagination.total)}</span>
        of <span class="font-medium text-gray-700">{pagination.total.toLocaleString()}</span> skills
      </div>
      <div class="flex items-center gap-2">
        <button
          onclick={() => goToPage(pagination.page - 1)}
          disabled={pagination.page === 1}
          class="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>
        <span class="px-3 py-1.5 text-sm text-gray-500">
          Page <span class="font-medium text-gray-700">{pagination.page}</span> of <span class="font-medium text-gray-700">{pagination.total_pages}</span>
        </span>
        <button
          onclick={() => goToPage(pagination.page + 1)}
          disabled={pagination.page >= pagination.total_pages}
          class="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</div>
