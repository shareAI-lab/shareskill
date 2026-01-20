<script lang="ts">
  import { Icon } from '$components/ui';
  import { _ } from 'svelte-i18n';

  let copied = $state(false);
  let claudeCodeCopied = $state(false);
  let claudeCodeCmdCopied = $state(false);
  let cursorConfigCopied = $state(false);
  let codexCopied = $state(false);

  function copyCommand() {
    navigator.clipboard.writeText('npx shareskill');
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function copyClaudeCodeCmd() {
    navigator.clipboard.writeText('claude mcp add shareskill -- npx shareskill');
    claudeCodeCmdCopied = true;
    setTimeout(() => (claudeCodeCmdCopied = false), 2000);
  }

  function copyClaudeCodeConfig() {
    const config = `{
  "mcpServers": {
    "shareskill": {
      "command": "npx",
      "args": ["shareskill"]
    }
  }
}`;
    navigator.clipboard.writeText(config);
    claudeCodeCopied = true;
    setTimeout(() => (claudeCodeCopied = false), 2000);
  }

  function copyCursorConfig() {
    const config = `{
  "mcpServers": {
    "shareskill": {
      "command": "npx",
      "args": ["shareskill"]
    }
  }
}`;
    navigator.clipboard.writeText(config);
    cursorConfigCopied = true;
    setTimeout(() => (cursorConfigCopied = false), 2000);
  }

  function copyCodexCmd() {
    navigator.clipboard.writeText('codex mcp add shareskill -- npx shareskill');
    codexCopied = true;
    setTimeout(() => (codexCopied = false), 2000);
  }
</script>

<svelte:head>
  <title>{$_('mcp.pageTitle')}</title>
  <meta name="description" content={$_('mcp.pageDescription')} />
</svelte:head>

<div class="min-h-screen bg-white dark:bg-neutral-950">
  <!-- Hero -->
  <section class="bg-gradient-to-br from-gray-900 via-gray-800 to-neutral-900 text-white py-20 md:py-28">
    <div class="container">
      <div class="max-w-4xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/20 border border-primary-500/30 text-primary-300 text-sm font-medium mb-8">
          <Icon name="package" size={14} />
          MCP Server
        </div>
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 tracking-tight">
          ShareSkill MCP
        </h1>
        <p class="text-xl md:text-2xl text-gray-300 mb-10 leading-relaxed max-w-3xl">
          {$_('mcp.heroSubtitle')}
        </p>
        <div class="flex flex-wrap gap-4">
          <button
            onclick={copyCommand}
            class="inline-flex items-center gap-2 px-6 py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-primary-500/25"
          >
            {#if copied}
              <Icon name="check" size={20} />
              {$_('common.copied')}
            {:else}
              <Icon name="terminal" size={20} />
              npx shareskill
            {/if}
          </button>
          <a
            href="https://github.com/shareAI-lab/shareskill"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-6 py-3.5 bg-gray-700/50 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors border border-gray-600"
          >
            <Icon name="github" size={20} />
            GitHub
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- Content -->
  <div class="container py-16 md:py-24">
    <div class="max-w-4xl mx-auto">
      <!-- Why ShareSkill MCP -->
      <section class="mb-20">
        <h2 class="text-3xl font-display font-bold text-gray-900 dark:text-white mb-4">
          {$_('mcp.whyTitle')}
        </h2>
        <p class="text-lg text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
          {$_('mcp.whyDesc')}
        </p>

        <div class="grid md:grid-cols-3 gap-6">
          <div class="group p-6 bg-gray-50 dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 hover:border-primary-200 dark:hover:border-primary-800 transition-colors">
            <div class="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 mb-4 group-hover:scale-110 transition-transform">
              <Icon name="search" size={24} />
            </div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-2 text-lg">{$_('mcp.semanticSearch')}</h3>
            <p class="text-gray-600 dark:text-gray-400">
              {$_('mcp.semanticSearchDesc')}
            </p>
          </div>
          <div class="group p-6 bg-gray-50 dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 hover:border-success-200 dark:hover:border-success-800 transition-colors">
            <div class="w-12 h-12 rounded-xl bg-success-100 dark:bg-success-900/30 flex items-center justify-center text-success-600 dark:text-success-400 mb-4 group-hover:scale-110 transition-transform">
              <Icon name="shield-check" size={24} />
            </div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-2 text-lg">{$_('mcp.securityAudited')}</h3>
            <p class="text-gray-600 dark:text-gray-400">
              {$_('mcp.securityAuditedDesc')}
            </p>
          </div>
          <div class="group p-6 bg-gray-50 dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 hover:border-accent-200 dark:hover:border-accent-800 transition-colors">
            <div class="w-12 h-12 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center text-accent-600 dark:text-accent-400 mb-4 group-hover:scale-110 transition-transform">
              <Icon name="folder" size={24} />
            </div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-2 text-lg">{$_('mcp.offlineFirst')}</h3>
            <p class="text-gray-600 dark:text-gray-400">
              {$_('mcp.offlineFirstDesc')}
            </p>
          </div>
        </div>
      </section>

      <!-- Installation -->
      <section class="mb-20">
        <h2 class="text-3xl font-display font-bold text-gray-900 dark:text-white mb-4">
          {$_('mcp.quickStart')}
        </h2>
        <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">
          {$_('mcp.quickStartDesc')}
        </p>

        <div class="space-y-6">
          <!-- Claude Code -->
          <div class="p-6 bg-gray-50 dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm">C</div>
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-white">{$_('mcp.claudeCode')}</h3>
                <p class="text-sm text-gray-500">{$_('mcp.claudeCodeDesc')}</p>
              </div>
            </div>

            <!-- One-line command -->
            <div class="mb-4">
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">One-line install:</p>
              <div class="relative">
                <pre class="p-4 bg-gray-900 text-gray-100 rounded-xl text-sm overflow-x-auto font-mono"><code><span class="text-gray-500">$</span> <span class="text-green-400">claude mcp add shareskill -- npx shareskill</span></code></pre>
                <button
                  onclick={copyClaudeCodeCmd}
                  class="absolute top-3 right-3 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  aria-label={$_('common.copyCommand')}
                >
                  {#if claudeCodeCmdCopied}
                    <Icon name="check" size={16} class={"text-success-400"} />
                  {:else}
                    <Icon name="copy" size={16} class={"text-gray-400"} />
                  {/if}
                </button>
              </div>
            </div>

            <!-- Or manual config -->
            <details class="group">
              <summary class="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                Or add to <code class="px-2 py-0.5 bg-gray-200 dark:bg-neutral-800 rounded text-xs font-mono">~/.claude/settings.json</code> manually
              </summary>
              <div class="relative mt-3">
                <pre class="p-4 bg-gray-900 text-gray-100 rounded-xl text-sm overflow-x-auto font-mono"><code>{`{
  "mcpServers": {
    "shareskill": {
      "command": "npx",
      "args": ["shareskill"]
    }
  }
}`}</code></pre>
                <button
                  onclick={copyClaudeCodeConfig}
                  class="absolute top-3 right-3 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  aria-label={$_('common.copyCommand')}
                >
                  {#if claudeCodeCopied}
                    <Icon name="check" size={16} class={"text-success-400"} />
                  {:else}
                    <Icon name="copy" size={16} class={"text-gray-400"} />
                  {/if}
                </button>
              </div>
            </details>
          </div>

          <!-- Codex CLI -->
          <div class="p-6 bg-gray-50 dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">Cx</div>
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-white">{$_('mcp.codex')}</h3>
                <p class="text-sm text-gray-500">{$_('mcp.codexDesc')}</p>
              </div>
            </div>

            <!-- One-line command -->
            <div class="mb-4">
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">One-line install:</p>
              <div class="relative">
                <pre class="p-4 bg-gray-900 text-gray-100 rounded-xl text-sm overflow-x-auto font-mono"><code><span class="text-gray-500">$</span> <span class="text-green-400">codex mcp add shareskill -- npx shareskill</span></code></pre>
                <button
                  onclick={copyCodexCmd}
                  class="absolute top-3 right-3 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  aria-label={$_('common.copyCommand')}
                >
                  {#if codexCopied}
                    <Icon name="check" size={16} class={"text-success-400"} />
                  {:else}
                    <Icon name="copy" size={16} class={"text-gray-400"} />
                  {/if}
                </button>
              </div>
            </div>

            <p class="text-sm text-gray-500 dark:text-gray-400">
              Config stored in <code class="px-2 py-0.5 bg-gray-200 dark:bg-neutral-800 rounded text-xs font-mono">~/.codex/config.toml</code>
            </p>
          </div>

          <!-- Cursor -->
          <div class="p-6 bg-gray-50 dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">Cu</div>
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-white">{$_('mcp.cursor')}</h3>
                <p class="text-sm text-gray-500">{$_('mcp.cursorDesc')}</p>
              </div>
            </div>
            <p class="text-gray-600 dark:text-gray-400 mb-4">
              {$_('mcp.addTo')} <code class="px-2 py-0.5 bg-gray-200 dark:bg-neutral-800 rounded text-sm font-mono">~/.cursor/mcp.json</code>:
            </p>
            <div class="relative">
              <pre class="p-4 bg-gray-900 text-gray-100 rounded-xl text-sm overflow-x-auto font-mono"><code>{`{
  "mcpServers": {
    "shareskill": {
      "command": "npx",
      "args": ["shareskill"]
    }
  }
}`}</code></pre>
              <button
                onclick={copyCursorConfig}
                class="absolute top-3 right-3 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                aria-label={$_('common.copyCommand')}
              >
                {#if cursorConfigCopied}
                  <Icon name="check" size={16} class={"text-success-400"} />
                {:else}
                  <Icon name="copy" size={16} class={"text-gray-400"} />
                {/if}
              </button>
            </div>
          </div>

          <!-- Other Agents -->
          <div class="p-6 bg-gray-50 dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                <Icon name="star" size={20} />
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-white">{$_('mcp.otherAgents')}</h3>
                <p class="text-sm text-gray-500">{$_('mcp.otherAgentsDesc')}</p>
              </div>
            </div>
            <p class="text-gray-600 dark:text-gray-400">
              {$_('mcp.otherAgentsNote')}
            </p>
          </div>
        </div>
      </section>

      <!-- Available Tools -->
      <section class="mb-20">
        <h2 class="text-3xl font-display font-bold text-gray-900 dark:text-white mb-4">
          {$_('mcp.availableTools')}
        </h2>
        <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">
          {$_('mcp.availableToolsDesc')}
        </p>

        <div class="overflow-hidden rounded-2xl border border-gray-200 dark:border-neutral-800">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 dark:bg-neutral-900">
              <tr>
                <th class="text-left py-4 px-5 font-semibold text-gray-900 dark:text-white">{$_('mcp.tool')}</th>
                <th class="text-left py-4 px-5 font-semibold text-gray-900 dark:text-white">{$_('mcp.network')}</th>
                <th class="text-left py-4 px-5 font-semibold text-gray-900 dark:text-white">{$_('mcp.description')}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-neutral-800 bg-white dark:bg-neutral-950">
              <tr class="hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors">
                <td class="py-4 px-5"><code class="text-primary-600 dark:text-primary-400 font-mono text-xs">remote_search_skills</code></td>
                <td class="py-4 px-5"><span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400">{$_('mcp.online')}</span></td>
                <td class="py-4 px-5 text-gray-600 dark:text-gray-400">{$_('mcp.remoteSearchSkills')}</td>
              </tr>
              <tr class="hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors">
                <td class="py-4 px-5"><code class="text-primary-600 dark:text-primary-400 font-mono text-xs">remote_get_skill</code></td>
                <td class="py-4 px-5"><span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400">{$_('mcp.online')}</span></td>
                <td class="py-4 px-5 text-gray-600 dark:text-gray-400">{$_('mcp.remoteGetSkill')}</td>
              </tr>
              <tr class="hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors">
                <td class="py-4 px-5"><code class="text-primary-600 dark:text-primary-400 font-mono text-xs">remote_download_skill</code></td>
                <td class="py-4 px-5"><span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400">{$_('mcp.online')}</span></td>
                <td class="py-4 px-5 text-gray-600 dark:text-gray-400">{$_('mcp.remoteDownloadSkill')}</td>
              </tr>
              <tr class="hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors">
                <td class="py-4 px-5"><code class="text-success-600 dark:text-success-400 font-mono text-xs">local_list_skills</code></td>
                <td class="py-4 px-5"><span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400">{$_('mcp.offline')}</span></td>
                <td class="py-4 px-5 text-gray-600 dark:text-gray-400">{$_('mcp.localListSkills')}</td>
              </tr>
              <tr class="hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors">
                <td class="py-4 px-5"><code class="text-success-600 dark:text-success-400 font-mono text-xs">local_get_skill</code></td>
                <td class="py-4 px-5"><span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400">{$_('mcp.offline')}</span></td>
                <td class="py-4 px-5 text-gray-600 dark:text-gray-400">{$_('mcp.localGetSkill')}</td>
              </tr>
              <tr class="hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors">
                <td class="py-4 px-5"><code class="text-success-600 dark:text-success-400 font-mono text-xs">local_remove_skill</code></td>
                <td class="py-4 px-5"><span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400">{$_('mcp.offline')}</span></td>
                <td class="py-4 px-5 text-gray-600 dark:text-gray-400">{$_('mcp.localRemoveSkill')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- CLI Commands -->
      <section class="mb-20">
        <h2 class="text-3xl font-display font-bold text-gray-900 dark:text-white mb-4">
          {$_('mcp.cliReference')}
        </h2>
        <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">
          {$_('mcp.cliReferenceDesc')}
        </p>
        <div class="space-y-4">
          <div class="p-5 bg-gray-900 rounded-xl">
            <code class="text-green-400 font-mono">$ npx shareskill download &lt;skill-key&gt;</code>
            <p class="text-gray-500 text-sm mt-2">{$_('mcp.downloadCmd')}</p>
          </div>
          <div class="p-5 bg-gray-900 rounded-xl">
            <code class="text-green-400 font-mono">$ npx shareskill list</code>
            <p class="text-gray-500 text-sm mt-2">{$_('mcp.listCmd')}</p>
          </div>
          <div class="p-5 bg-gray-900 rounded-xl">
            <code class="text-green-400 font-mono">$ npx shareskill remove &lt;skill-name&gt;</code>
            <p class="text-gray-500 text-sm mt-2">{$_('mcp.removeCmd')}</p>
          </div>
        </div>
      </section>

      <!-- Storage -->
      <section>
        <h2 class="text-3xl font-display font-bold text-gray-900 dark:text-white mb-4">
          {$_('mcp.localStorage')}
        </h2>
        <p class="text-lg text-gray-600 dark:text-gray-400 mb-6">
          {$_('mcp.localStorageDesc')}
        </p>
        <div class="p-5 bg-gray-100 dark:bg-neutral-900 rounded-xl font-mono text-sm border border-gray-200 dark:border-neutral-800">
          ~/.shareskill/skills/
        </div>
        <p class="text-gray-500 dark:text-gray-500 mt-4">
          {$_('mcp.localStorageNote')}
        </p>
      </section>
    </div>
  </div>
</div>
