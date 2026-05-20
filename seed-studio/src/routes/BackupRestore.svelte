<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button/index.js';

  interface Props {
    apiToken: string;
  }

  let { apiToken }: Props = $props();

  // Pipeline State
  let isRunning = $state(false);
  let currentAction = $state('');
  let logs = $state<string[]>([]);
  let logContainer: HTMLElement | null = $state(null);

  // Preview State
  let backupPreview = $state<any>(null);
  let isLoadingPreview = $state(false);
  let selectedPreviewType = $state('');
  let selectedPreviewItems = $state<any[]>([]);
  let isPreviewModalOpen = $state(false);

  // Restore Options
  let restoreContent = $state(true);
  let restoreFiles = $state(true);
  let restoreConfig = $state(true);

  function openPreviewModal(type: string, items: any[]) {
    selectedPreviewType = type;
    selectedPreviewItems = items;
    isPreviewModalOpen = true;
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (logContainer) logContainer.scrollTop = logContainer.scrollHeight;
    }, 50);
  }

  function getLogColor(log: string) {
    const l = log.toLowerCase();
    if (l.includes('error')) return 'text-destructive';
    if (l.includes('success')) return 'text-success';
    if (l.includes('skip')) return 'text-warning';
    if (l.includes('info')) return 'text-info';
    if (l.startsWith('>')) return 'text-primary font-bold mt-2';
    return 'text-foreground';
  }

  function runBackupRestore() {
    if (isRunning) return;
    
    if (!confirm('🚨 NGUY HIỂM: Quá trình khôi phục sẽ xóa sạch toàn bộ cơ sở dữ liệu và thư viện media hiện tại của bạn!\n\nBạn có chắc chắn muốn tiếp tục không?')) {
      return;
    }

    isRunning = true;
    currentAction = 'restore';
    logs = ['> Starting Strapi Backup Restore...'];
    
    const options: string[] = [];
    if (restoreContent) options.push('content');
    if (restoreFiles) options.push('files');
    if (restoreConfig) options.push('config');
    const onlyQuery = options.length > 0 && options.length < 3 ? `only=${options.join(',')}` : '';

    let queryParams: string[] = [];
    if (apiToken) queryParams.push(`token=${apiToken}`);
    if (onlyQuery) queryParams.push(onlyQuery);
    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    
    const eventSource = new EventSource(`/api/restore-stream${queryString}`);

    eventSource.addEventListener('log', (e) => {
      const lines = JSON.parse(e.data).split('\n');
      for (let l of lines) {
        if (l.trim()) logs.push(l.trim());
      }
      scrollToBottom();
    });

    eventSource.addEventListener('done', (e) => {
      const data = JSON.parse(e.data);
      logs.push(`\n> Process finished with code ${data.code}.`);
      scrollToBottom();
      eventSource.close();
      isRunning = false;
      currentAction = '';
    });

    eventSource.onerror = (e) => {
      console.error('SSE Error', e);
      logs.push('> Connection lost.');
      eventSource.close();
      isRunning = false;
      currentAction = '';
    };
  }

  function loadBackupPreview() {
    if (backupPreview || isLoadingPreview) return;
    isLoadingPreview = true;
    fetch('/api/backup-preview')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          backupPreview = data.stats;
        } else {
          backupPreview = { error: data.error };
        }
      })
      .catch(err => {
        backupPreview = { error: err.message };
      })
      .finally(() => {
        isLoadingPreview = false;
      });
  }

  onMount(() => {
    loadBackupPreview();
  });
</script>

<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
  <div class="lg:col-span-1 space-y-4">
    <div class="bg-muted/50 border border-border rounded-xl p-5">
      <h2 class="text-lg font-bold text-foreground mb-4">Restore Database</h2>
      <p class="text-sm text-muted-foreground mb-4">Executes `strapi import`. This will completely replace your current database and media library.</p>
      
      <div class="space-y-3 mb-6 bg-card p-4 rounded-lg border border-border">
        <h3 class="text-sm font-semibold text-foreground">Select data to import:</h3>
        <label class="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
          <input type="checkbox" bind:checked={restoreContent} class="accent-primary w-4 h-4 rounded" />
          <span>📄 Content (Entities)</span>
        </label>
        <label class="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
          <input type="checkbox" bind:checked={restoreFiles} class="accent-primary w-4 h-4 rounded" />
          <span>🖼️ Files (Media uploads)</span>
        </label>
        <label class="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
          <input type="checkbox" bind:checked={restoreConfig} class="accent-primary w-4 h-4 rounded" />
          <span>⚙️ Config (Settings, roles)</span>
        </label>
      </div>
      
      <div class="mb-6 bg-muted/30 p-4 rounded-lg border border-border">
        <h3 class="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <span aria-hidden="true">📊</span> Dữ liệu bên trong Backup
        </h3>
        {#if isLoadingPreview}
          <div class="flex items-center text-sm text-muted-foreground">
            <span class="animate-spin mr-2" role="status">⏳</span> Đang quét file tar.gz...
          </div>
        {:else if backupPreview?.error}
          <div class="text-sm text-destructive font-medium">Lỗi: {backupPreview.error}</div>
        {:else if backupPreview}
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="bg-card p-3 rounded border border-border flex flex-col justify-between">
              <div class="text-muted-foreground text-xs mb-1 uppercase font-bold tracking-wider">Articles</div>
              <div class="flex items-end justify-between">
                <div class="text-xl font-bold">{backupPreview.articles.count}</div>
                {#if backupPreview.articles.count > 0}
                  <button onclick={() => openPreviewModal('Articles', backupPreview.articles.items)} class="text-xs text-primary hover:underline flex items-center gap-1">🔍 Chi tiết</button>
                {/if}
              </div>
            </div>
            <div class="bg-card p-3 rounded border border-border flex flex-col justify-between">
              <div class="text-muted-foreground text-xs mb-1 uppercase font-bold tracking-wider">Categories</div>
              <div class="flex items-end justify-between">
                <div class="text-xl font-bold">{backupPreview.categories.count}</div>
                {#if backupPreview.categories.count > 0}
                  <button onclick={() => openPreviewModal('Categories', backupPreview.categories.items)} class="text-xs text-primary hover:underline flex items-center gap-1">🔍 Chi tiết</button>
                {/if}
              </div>
            </div>
            <div class="bg-card p-3 rounded border border-border flex flex-col justify-between">
              <div class="text-muted-foreground text-xs mb-1 uppercase font-bold tracking-wider">Media Files</div>
              <div class="flex items-end justify-between">
                <div class="text-xl font-bold">{backupPreview.media.count}</div>
                {#if backupPreview.media.count > 0}
                  <button onclick={() => openPreviewModal('Media Files', backupPreview.media.items)} class="text-xs text-primary hover:underline flex items-center gap-1">🔍 Chi tiết</button>
                {/if}
              </div>
            </div>
            <div class="bg-card p-3 rounded border border-border flex flex-col justify-between">
              <div class="text-muted-foreground text-xs mb-1 uppercase font-bold tracking-wider">Users</div>
              <div class="flex items-end justify-between">
                <div class="text-xl font-bold">{backupPreview.users.count}</div>
                {#if backupPreview.users.count > 0}
                  <button onclick={() => openPreviewModal('Users', backupPreview.users.items)} class="text-xs text-primary hover:underline flex items-center gap-1">🔍 Chi tiết</button>
                {/if}
              </div>
            </div>
          </div>
        {:else}
          <div class="text-sm text-muted-foreground">Chưa có dữ liệu.</div>
        {/if}
      </div>

      <Button onclick={runBackupRestore} disabled={isRunning || (!restoreContent && !restoreFiles && !restoreConfig)} class="w-full">
        {#if isRunning && currentAction === 'restore'}
          <span class="animate-spin mr-2" role="status" aria-label="Loading">⏳</span>
        {:else}
          <span class="mr-2" aria-hidden="true">🔄</span>
        {/if}
        Start Restore
      </Button>
    </div>
    <div class="bg-muted/50 border border-border rounded-xl p-5">
      <h2 class="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Status</h2>
      <div class="flex items-center gap-3">
        <div class="w-3 h-3 rounded-full {isRunning ? 'bg-warning animate-pulse' : 'bg-success'}"></div>
        <span class="text-sm font-medium">{isRunning ? 'Restoring...' : 'Idle'}</span>
      </div>
    </div>
  </div>

  <div class="lg:col-span-3">
    <div class="rounded-xl overflow-hidden flex flex-col h-[600px] shadow-2xl bg-card border border-border">
      <div class="bg-muted px-4 py-3 flex items-center justify-between border-b border-border">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-destructive/80"></div>
          <div class="w-3 h-3 rounded-full bg-warning/80"></div>
          <div class="w-3 h-3 rounded-full bg-success/80"></div>
          <span class="ml-3 text-xs font-mono text-muted-foreground">yarn strapi import -f ...</span>
        </div>
        <Button variant="outline" size="sm" onclick={() => logs = []} class="h-8">Clear</Button>
      </div>
      <div class="p-4 overflow-y-auto flex-1 font-mono text-sm" bind:this={logContainer}>
        {#if logs.length === 0}
          <div class="text-muted-foreground italic">Ready to restore.</div>
        {/if}
        {#each logs as log}
          <div class="mb-1 {getLogColor(log)}">{log}</div>
        {/each}
      </div>
    </div>
  </div>
</div>

<!-- Preview Modal Overlay -->
{#if isPreviewModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onclick={(e) => { if (e.target === e.currentTarget) isPreviewModalOpen = false; }}>
    <div class="bg-card border border-border shadow-2xl rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
      <div class="flex items-center justify-between border-b border-border p-4">
        <h3 class="text-lg font-bold text-foreground">Chi tiết {selectedPreviewType} <span class="text-muted-foreground font-normal text-sm ml-2">({selectedPreviewItems.length} items)</span></h3>
        <button onclick={() => isPreviewModalOpen = false} class="w-8 h-8 flex items-center justify-center rounded hover:bg-muted text-muted-foreground transition-colors">✕</button>
      </div>
      <div class="p-4 overflow-y-auto flex-1 bg-muted/20">
        {#if selectedPreviewItems.length === 0}
          <div class="text-center text-muted-foreground py-8">Không có dữ liệu.</div>
        {:else}
          <ul class="space-y-2">
            {#each selectedPreviewItems as item, idx}
              <li class="bg-card border border-border p-3 rounded-lg shadow-sm text-sm flex gap-3 hover:border-primary/50 transition-colors">
                <span class="text-muted-foreground font-mono w-6 text-right shrink-0">{idx + 1}.</span>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-foreground truncate">{item.title || 'Untitled'}</div>
                  {#if item.slug || item.email || item.url}
                    <div class="text-xs text-muted-foreground mt-1 truncate">{item.slug || item.email || item.url}</div>
                  {/if}
                </div>
                <div class="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground self-start shrink-0">ID: {item.id}</div>
              </li>
            {/each}
          </ul>
          {#if selectedPreviewItems.length === 200}
            <div class="text-center text-xs text-muted-foreground mt-6 mb-2 italic">Chỉ hiển thị 200 mục đầu tiên để tối ưu hiệu suất.</div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
{/if}
