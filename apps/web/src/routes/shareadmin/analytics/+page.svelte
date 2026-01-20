<script lang="ts">
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Derived values for reactive data access
  let hours = $derived(data.hours);
  let eventSummary = $derived(data.event_summary);
  let totalSearches = $derived(data.total_searches);
  let topSearches = $derived(data.top_searches);
  let zeroResultSearches = $derived(data.zero_result_searches);
  let sourceDistribution = $derived(data.source_distribution);

  // Local state for form inputs
  let selectedHours = $state(24);

  // Sync local state with data on initial load and navigation
  $effect(() => {
    selectedHours = hours;
  });

  function changeTimeRange() {
    goto(`/shareadmin/analytics?hours=${selectedHours}`);
  }

  const totalSourceEvents = $derived(
    Object.values(sourceDistribution).reduce((a, b) => a + b, 0)
  );

  const timeRangeLabel = $derived({
    24: '24 hours',
    72: '3 days',
    168: '7 days',
    720: '30 days',
  }[hours] || `${hours} hours`);
</script>

<svelte:head>
  <title>Analytics - ShareSkill Admin</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Analytics</h1>
      <p class="text-sm text-gray-500 mt-1">Track usage patterns and search trends</p>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-sm text-gray-500">Time Range:</span>
      <select
        bind:value={selectedHours}
        onchange={changeTimeRange}
        class="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-admin-500 focus:border-transparent"
      >
        <option value={24}>Last 24 hours</option>
        <option value={72}>Last 3 days</option>
        <option value={168}>Last 7 days</option>
        <option value={720}>Last 30 days</option>
      </select>
    </div>
  </div>

  <!-- Event Summary -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500">Views</p>
          <p class="text-3xl font-bold text-gray-900 mt-1">{eventSummary.view.toLocaleString()}</p>
        </div>
        <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
          <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
      </div>
      <p class="text-xs text-gray-400 mt-3">Last {timeRangeLabel}</p>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500">Searches</p>
          <p class="text-3xl font-bold text-gray-900 mt-1">{totalSearches.toLocaleString()}</p>
        </div>
        <div class="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
          <svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      <p class="text-xs text-gray-400 mt-3">Last {timeRangeLabel}</p>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500">Downloads</p>
          <p class="text-3xl font-bold text-gray-900 mt-1">{eventSummary.download.toLocaleString()}</p>
        </div>
        <div class="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
          <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
      </div>
      <p class="text-xs text-gray-400 mt-3">Last {timeRangeLabel}</p>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500">Installs</p>
          <p class="text-3xl font-bold text-gray-900 mt-1">{eventSummary.install.toLocaleString()}</p>
        </div>
        <div class="w-12 h-12 bg-admin-50 rounded-xl flex items-center justify-center">
          <svg class="w-6 h-6 text-admin-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
        </div>
      </div>
      <p class="text-xs text-gray-400 mt-3">Last {timeRangeLabel}</p>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Top Searches -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-lg font-semibold text-gray-900">Top Searches</h2>
        <span class="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Last {timeRangeLabel}</span>
      </div>
      {#if topSearches.length === 0}
        <div class="text-center py-12 text-gray-400">
          <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p class="text-sm">No search data in this period</p>
        </div>
      {:else}
        <div class="space-y-2 max-h-96 overflow-y-auto pr-2">
          {#each topSearches as search, i}
            <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div class="flex items-center gap-3">
                <span class="w-7 h-7 flex items-center justify-center text-xs font-bold {i < 3 ? 'bg-admin-100 text-admin-700' : 'bg-gray-100 text-gray-500'} rounded-full">
                  {i + 1}
                </span>
                <span class="text-sm font-medium text-gray-700">{search.query}</span>
              </div>
              <span class="text-sm text-gray-400 font-medium tabular-nums">{search.count}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Zero-Result Searches -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Zero-Result Searches</h2>
          <p class="text-xs text-gray-500 mt-1">Searches that returned no results</p>
        </div>
        <span class="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Last 7 days</span>
      </div>
      {#if zeroResultSearches.length === 0}
        <div class="text-center py-12 text-gray-400">
          <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm">All searches returned results!</p>
        </div>
      {:else}
        <div class="space-y-2 max-h-96 overflow-y-auto pr-2">
          {#each zeroResultSearches as search, i}
            <div class="flex items-center justify-between p-3 rounded-lg hover:bg-red-50/50 transition-colors border border-transparent hover:border-red-100">
              <div class="flex items-center gap-3">
                <span class="w-7 h-7 flex items-center justify-center text-xs font-bold bg-red-100 text-red-600 rounded-full">
                  {i + 1}
                </span>
                <span class="text-sm font-medium text-red-700">{search.query}</span>
              </div>
              <span class="text-sm text-red-400 font-medium tabular-nums">{search.count}x</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Source Distribution -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-lg font-semibold text-gray-900">Traffic Source Distribution</h2>
        <span class="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Last {timeRangeLabel}</span>
      </div>
      {#if totalSourceEvents === 0}
        <div class="text-center py-12 text-gray-400">
          <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p class="text-sm">No traffic data in this period</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          {#each Object.entries(sourceDistribution).sort((a, b) => b[1] - a[1]) as [source, count]}
            {@const percentage = (count / totalSourceEvents) * 100}
            {@const colors = {
              web: { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700' },
              mcp: { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-700' },
              api: { bg: 'bg-green-500', light: 'bg-green-100', text: 'text-green-700' },
            }[source] || { bg: 'bg-gray-500', light: 'bg-gray-100', text: 'text-gray-700' }}
            <div class="p-5 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
              <div class="flex items-center justify-between mb-4">
                <span class="text-sm font-semibold text-gray-900 uppercase">{source}</span>
                <span class="text-2xl font-bold text-gray-900">{percentage.toFixed(1)}%</span>
              </div>
              <div class="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div class="h-full {colors.bg} rounded-full transition-all duration-500" style="width: {percentage}%"></div>
              </div>
              <p class="text-sm text-gray-500">{count.toLocaleString()} events</p>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
