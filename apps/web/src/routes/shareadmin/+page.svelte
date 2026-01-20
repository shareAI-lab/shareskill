<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const sortedCategories = $derived(
    Object.entries(data.category_distribution)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 10)
  );

  const maxCategoryCount = $derived(sortedCategories[0]?.[1] as number || 1);
</script>

<svelte:head>
  <title>Dashboard - ShareSkill Admin</title>
</svelte:head>

<div class="space-y-8">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p class="text-sm text-gray-500 mt-1">Overview of your skill registry</p>
    </div>
    <div class="text-xs text-gray-400">
      Last updated: {new Date().toLocaleString()}
    </div>
  </div>

  <!-- Primary Stats -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500">Total Skills</p>
          <p class="text-3xl font-bold text-gray-900 mt-1">{data.stats.total_skills.toLocaleString()}</p>
        </div>
        <div class="w-12 h-12 bg-admin-50 rounded-xl flex items-center justify-center">
          <svg class="w-6 h-6 text-admin-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500">Repositories</p>
          <p class="text-3xl font-bold text-gray-900 mt-1">{data.stats.total_repos.toLocaleString()}</p>
        </div>
        <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
          <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500">Total Searches</p>
          <p class="text-3xl font-bold text-gray-900 mt-1">{data.stats.total_searches.toLocaleString()}</p>
        </div>
        <div class="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
          <svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500">Total Events</p>
          <p class="text-3xl font-bold text-gray-900 mt-1">{data.stats.total_events.toLocaleString()}</p>
        </div>
        <div class="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
          <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
      </div>
    </div>
  </div>

  <!-- Secondary Stats -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
    <div class="bg-gradient-to-br from-admin-500 to-admin-600 rounded-xl shadow-lg p-6 text-white">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-admin-100 text-sm font-medium">Featured Skills</p>
          <p class="text-4xl font-bold mt-1">{data.stats.featured_count}</p>
        </div>
        <svg class="w-10 h-10 text-admin-300/50" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
    </div>

    <div class="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-orange-100 text-sm font-medium">Flagged Skills</p>
          <p class="text-4xl font-bold mt-1">{data.stats.flagged_count}</p>
        </div>
        <svg class="w-10 h-10 text-orange-300/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
      </div>
    </div>

    <div class="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-yellow-100 text-sm font-medium">High Risk Warnings</p>
          <p class="text-4xl font-bold mt-1">{data.warning_distribution.high}</p>
        </div>
        <svg class="w-10 h-10 text-yellow-300/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
    </div>
  </div>

  <!-- Charts & Lists -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Category Distribution -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-5">Category Distribution</h2>
      <div class="space-y-4">
        {#each sortedCategories as [category, count]}
          {@const percentage = ((count as number) / maxCategoryCount) * 100}
          <div class="group">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-sm font-medium text-gray-700 capitalize">{category}</span>
              <span class="text-sm text-gray-500">{count}</span>
            </div>
            <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-admin-400 to-admin-500 rounded-full transition-all duration-500"
                style="width: {percentage}%"
              ></div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Security Warnings -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-5">Security Overview</h2>
      <div class="grid grid-cols-2 gap-4">
        <div class="p-4 bg-red-50 rounded-xl border border-red-100">
          <div class="text-2xl font-bold text-red-600">{data.warning_distribution.high}</div>
          <div class="text-sm text-red-600/80 font-medium">High Severity</div>
        </div>
        <div class="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
          <div class="text-2xl font-bold text-yellow-600">{data.warning_distribution.medium}</div>
          <div class="text-sm text-yellow-600/80 font-medium">Medium</div>
        </div>
        <div class="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div class="text-2xl font-bold text-blue-600">{data.warning_distribution.low}</div>
          <div class="text-sm text-blue-600/80 font-medium">Low</div>
        </div>
        <div class="p-4 bg-green-50 rounded-xl border border-green-100">
          <div class="text-2xl font-bold text-green-600">{data.warning_distribution.none}</div>
          <div class="text-sm text-green-600/80 font-medium">Clean</div>
        </div>
      </div>
    </div>

    <!-- High Risk Skills -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-lg font-semibold text-gray-900">High Risk Skills</h2>
        <a href="/shareadmin/security" class="text-sm text-admin-600 hover:text-admin-700 font-medium">View all</a>
      </div>
      {#if data.high_risk_skills.length === 0}
        <div class="text-center py-8 text-gray-400">
          <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p class="text-sm">No high risk skills found</p>
        </div>
      {:else}
        <div class="space-y-2">
          {#each data.high_risk_skills.slice(0, 6) as skill}
            <a
              href="/skill/{encodeURIComponent(skill.skill_key)}"
              target="_blank"
              class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
            >
              <div class="flex items-center gap-3 min-w-0">
                {#if skill.is_flagged}
                  <span class="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full"></span>
                {/if}
                <span class="text-sm font-medium text-gray-900 truncate">{skill.skill_slug || skill.name}</span>
              </div>
              <span class="flex-shrink-0 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                {skill.high_warning_count} high
              </span>
            </a>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Top Searches -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-lg font-semibold text-gray-900">Top Searches</h2>
        <span class="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Last 7 days</span>
      </div>
      {#if data.top_searches.length === 0}
        <div class="text-center py-8 text-gray-400">
          <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p class="text-sm">No search data yet</p>
        </div>
      {:else}
        <div class="space-y-2">
          {#each data.top_searches.slice(0, 8) as search, i}
            <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div class="flex items-center gap-3">
                <span class="w-6 h-6 flex items-center justify-center text-xs font-bold {i < 3 ? 'bg-admin-100 text-admin-700' : 'bg-gray-100 text-gray-500'} rounded-full">
                  {i + 1}
                </span>
                <span class="text-sm text-gray-700">{search.query}</span>
              </div>
              <span class="text-sm text-gray-400 font-medium">{search.count}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Featured Skills -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-lg font-semibold text-gray-900">Featured Skills</h2>
        <a href="/shareadmin/skills?featured=true" class="text-sm text-admin-600 hover:text-admin-700 font-medium">Manage</a>
      </div>
      {#if data.featured_skills.length === 0}
        <div class="text-center py-8 text-gray-400">
          <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <p class="text-sm">No featured skills yet</p>
          <a href="/shareadmin/skills" class="text-admin-600 text-sm font-medium mt-2 inline-block hover:underline">Add some from Skills page</a>
        </div>
      {:else}
        <div class="flex flex-wrap gap-2">
          {#each data.featured_skills as skill}
            <a
              href="/skill/{encodeURIComponent(skill.skill_key)}"
              target="_blank"
              class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-admin-50 to-admin-100 text-admin-700 rounded-full text-sm font-medium hover:from-admin-100 hover:to-admin-200 transition-colors border border-admin-200"
            >
              <svg class="w-3.5 h-3.5 text-admin-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {skill.skill_slug || skill.name}
            </a>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
