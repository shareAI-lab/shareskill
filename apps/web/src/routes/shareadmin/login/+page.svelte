<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
  let password = $state('');
  let isLoading = $state(false);
</script>

<svelte:head>
  <title>Login - ShareSkill Admin</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-admin-900 via-admin-800 to-admin-900 flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl backdrop-blur mb-4">
        <svg class="w-8 h-8 text-admin-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-white">ShareSkill Admin</h1>
      <p class="text-admin-300 text-sm mt-1">Enter your password to continue</p>
    </div>

    <!-- Login Form -->
    <div class="bg-white rounded-2xl shadow-2xl p-8">
      <form
        method="POST"
        use:enhance={() => {
          isLoading = true;
          return async ({ update }) => {
            await update();
            isLoading = false;
          };
        }}
      >
        <div class="mb-6">
          <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
            Admin Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            bind:value={password}
            required
            autocomplete="current-password"
            class="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-admin-500 focus:border-transparent transition-shadow"
            placeholder="Enter password..."
          />
        </div>

        {#if form?.error}
          <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div class="flex items-center gap-2 text-red-700">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span class="text-sm font-medium">{form.error}</span>
            </div>
          </div>
        {/if}

        <button
          type="submit"
          disabled={isLoading || !password}
          class="w-full py-3 px-4 bg-gradient-to-r from-admin-600 to-admin-700 text-white font-medium rounded-xl hover:from-admin-700 hover:to-admin-800 focus:outline-none focus:ring-2 focus:ring-admin-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-admin-500/25"
        >
          {#if isLoading}
            <span class="inline-flex items-center gap-2">
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </span>
          {:else}
            Sign In
          {/if}
        </button>
      </form>

      <div class="mt-6 text-center">
        <a href="/" class="text-sm text-gray-500 hover:text-admin-600 transition-colors">
          Back to site
        </a>
      </div>
    </div>

    <!-- Footer -->
    <p class="text-center text-admin-400 text-xs mt-8">
      Set ADMIN_PASSWORD environment variable to enable admin access
    </p>
  </div>
</div>
