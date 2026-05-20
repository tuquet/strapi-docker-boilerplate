<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { router } from '$lib/router.svelte';
  import { connectionStore } from '$lib/stores/connection.svelte';
  import type { Route } from '$lib/router.svelte';

  // Layout components
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import TopBar from '$lib/components/layout/TopBar.svelte';
  import ToastContainer from '$lib/components/layout/ToastContainer.svelte';

  // Route components
  import Dashboard from './routes/Dashboard.svelte';
  import SeedDataExplorer from './routes/SeedDataExplorer.svelte';
  import Pipeline from './routes/Pipeline.svelte';
  import BackupRestore from './routes/BackupRestore.svelte';
  import ArticleEditor from './routes/ArticleEditor.svelte';
  import Settings from './routes/Settings.svelte';

  // State
  let sidebarCollapsed = $state(false);

  // Derived route info for Sidebar and TopBar
  const currentRoute = $derived(router.currentRoute);
  const currentHash = $derived(`#/${router.currentRoute}`);
  const strapiStatus = $derived(connectionStore.strapiStatus);
  const apiToken = $derived(connectionStore.apiToken);

  onDestroy(() => {
    router.destroy();
    connectionStore.stopPolling();
  });
</script>

<div class="flex h-screen overflow-hidden bg-background text-foreground">
  <!-- Sidebar -->
  <Sidebar bind:collapsed={sidebarCollapsed} currentRoute={currentHash} />

  <!-- Main Content -->
  <div class="flex flex-1 flex-col overflow-hidden">
    <!-- TopBar -->
    <TopBar currentRoute={currentHash} strapiStatus={strapiStatus} />

    <!-- Page Content -->
    <main class="flex-1 overflow-y-auto p-6">
      {#if currentRoute === 'dashboard'}
        <Dashboard apiToken={apiToken} />
      {:else if currentRoute === 'content-explorer'}
        <div class="flex items-center justify-center h-full text-muted-foreground">
          <div class="text-center">
            <p class="text-4xl mb-4">📄</p>
            <h2 class="text-xl font-semibold text-foreground mb-2">Content Explorer</h2>
            <p class="text-sm">Coming in Sprint 3 — Browse all Strapi content types</p>
          </div>
        </div>
      {:else if currentRoute === 'article-editor'}
        <ArticleEditor apiToken={apiToken} />
      {:else if currentRoute === 'seed-data'}
        <SeedDataExplorer apiToken={apiToken} />
      {:else if currentRoute === 'pipeline'}
        <Pipeline apiToken={apiToken} />
      {:else if currentRoute === 'backup'}
        <BackupRestore apiToken={apiToken} />
      {:else if currentRoute === 'media'}
        <div class="flex items-center justify-center h-full text-muted-foreground">
          <div class="text-center">
            <p class="text-4xl mb-4">🖼️</p>
            <h2 class="text-xl font-semibold text-foreground mb-2">Media Library</h2>
            <p class="text-sm">Coming in Sprint 5 — Browse and manage Strapi media files</p>
          </div>
        </div>
      {:else if currentRoute === 'settings'}
        <Settings apiToken={apiToken} />
      {:else}
        <Dashboard apiToken={apiToken} />
      {/if}
    </main>
  </div>
</div>

<!-- Toast Notifications -->
<ToastContainer />
