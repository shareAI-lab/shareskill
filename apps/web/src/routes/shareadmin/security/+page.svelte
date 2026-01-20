<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const totalWarnings = $derived(
    data.warning_distribution.high +
      data.warning_distribution.medium +
      data.warning_distribution.low
  );

  const totalSkills = $derived(
    totalWarnings + data.warning_distribution.none
  );

  const cleanPercentage = $derived(
    totalSkills > 0 ? ((data.warning_distribution.none / totalSkills) * 100).toFixed(1) : '0'
  );
</script>

<svelte:head>
  <title>Security - ShareSkill Admin</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Security Monitoring</h1>
      <p class="text-sm text-gray-500 mt-1">Monitor security warnings and high-risk skills</p>
    </div>
    <div class="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
      <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <span class="text-sm font-medium text-green-700">{cleanPercentage}% Clean</span>
    </div>
  </div>

  <!-- Warning Distribution -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
    <div class="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-red-100 text-sm font-medium">High Severity</p>
          <p class="text-4xl font-bold mt-1">{data.warning_distribution.high}</p>
        </div>
        <svg class="w-10 h-10 text-red-300/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
    </div>

    <div class="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-yellow-100 text-sm font-medium">Medium</p>
          <p class="text-4xl font-bold mt-1">{data.warning_distribution.medium}</p>
        </div>
        <svg class="w-10 h-10 text-yellow-300/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </div>

    <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-blue-100 text-sm font-medium">Low</p>
          <p class="text-4xl font-bold mt-1">{data.warning_distribution.low}</p>
        </div>
        <svg class="w-10 h-10 text-blue-300/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </div>

    <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-green-100 text-sm font-medium">Clean</p>
          <p class="text-4xl font-bold mt-1">{data.warning_distribution.none}</p>
        </div>
        <svg class="w-10 h-10 text-green-300/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- High Risk Skills -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">High Risk Skills</h2>
          <p class="text-xs text-gray-500 mt-1">Skills with high severity warnings</p>
        </div>
        <a href="/shareadmin/skills?has_warnings=true" class="text-sm text-admin-600 hover:text-admin-700 font-medium">View all</a>
      </div>
      {#if data.high_risk_skills.length === 0}
        <div class="text-center py-12 text-gray-400">
          <svg class="w-16 h-16 mx-auto mb-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p class="text-sm font-medium text-green-600">No high risk skills found</p>
          <p class="text-xs text-gray-400 mt-1">All skills are secure!</p>
        </div>
      {:else}
        <div class="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {#each data.high_risk_skills as skill}
            <a
              href="/skill/{encodeURIComponent(skill.skill_key)}"
              class="flex items-center justify-between p-3 rounded-lg hover:bg-red-50/50 transition-colors border border-gray-100 hover:border-red-200"
              target="_blank"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  {#if skill.is_flagged}
                    <span class="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full" title="Flagged"></span>
                  {/if}
                  <span class="text-sm font-medium text-gray-900 truncate">
                    {skill.skill_slug || skill.name}
                  </span>
                </div>
                <div class="text-xs text-gray-500 mt-0.5 truncate">{skill.repo_full_name}</div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0 ml-3">
                <span class="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                  {skill.high_warning_count} high
                </span>
                {#if skill.total_warning_count > skill.high_warning_count}
                  <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                    +{skill.total_warning_count - skill.high_warning_count}
                  </span>
                {/if}
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Flagged Skills -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Flagged Skills</h2>
          <p class="text-xs text-gray-500 mt-1">Skills marked as problematic</p>
        </div>
        <a href="/shareadmin/skills?flagged=true" class="text-sm text-admin-600 hover:text-admin-700 font-medium">Manage</a>
      </div>
      {#if data.flagged_skills.length === 0}
        <div class="text-center py-12 text-gray-400">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
          </svg>
          <p class="text-sm">No flagged skills</p>
          <p class="text-xs text-gray-400 mt-1">Use the Skills page to flag problematic skills</p>
        </div>
      {:else}
        <div class="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {#each data.flagged_skills as skill}
            <a
              href="/skill/{encodeURIComponent(skill.skill_key)}"
              class="block p-3 rounded-lg hover:bg-orange-50/50 transition-colors border border-orange-100 hover:border-orange-200"
              target="_blank"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-medium text-gray-900">
                  {skill.skill_slug || skill.name}
                </span>
                <span class="text-xs text-gray-400">
                  {new Date(skill.flagged_at).toLocaleDateString()}
                </span>
              </div>
              <div class="text-xs text-orange-600 bg-orange-50 rounded px-2 py-1 inline-block">
                {skill.flag_reason}
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Recently Added -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Recently Added</h2>
          <p class="text-xs text-gray-500 mt-1">New skills added in the last 24 hours</p>
        </div>
        <span class="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{data.recent_skills.length} new skills</span>
      </div>
      {#if data.recent_skills.length === 0}
        <div class="text-center py-12 text-gray-400">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <p class="text-sm">No new skills in the last 24 hours</p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-100">
                <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Skill</th>
                <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Added</th>
                <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Security</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              {#each data.recent_skills as skill}
                <tr class="hover:bg-gray-50/50 transition-colors">
                  <td class="py-3 pr-4">
                    <a
                      href="/skill/{encodeURIComponent(skill.skill_key)}"
                      class="text-sm font-medium text-gray-900 hover:text-admin-600 transition-colors"
                      target="_blank"
                    >
                      {skill.skill_slug || skill.name}
                    </a>
                  </td>
                  <td class="py-3 pr-4">
                    <span class="text-sm text-gray-500">
                      {new Date(skill.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td class="py-3">
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
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>
</div>
