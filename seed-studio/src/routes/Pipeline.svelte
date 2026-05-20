<script lang="ts">
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

  function runSeed(action: string) {
    if (isRunning) return;
    
    isRunning = true;
    currentAction = action;
    logs = [];
    
    let query = '';
    if (action === 'clean-only') {
      if (!confirm('WARNING: This will WIPE the database completely. Are you sure?')) {
        isRunning = false;
        return;
      }
      query = '?clean-only=true';
      logs.push(`> Starting DB Wipe (clean-only)...`);
    } else {
      logs.push(`> Starting pipeline (update)...`);
    }

    const tokenQuery = apiToken ? `${query ? '&' : '?'}token=${apiToken}` : '';
    const eventSource = new EventSource(`/api/seed-stream${query}${tokenQuery}`);

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
    });

    eventSource.onerror = (e) => {
      console.error('SSE Error', e);
      logs.push('> Connection lost.');
      eventSource.close();
      isRunning = false;
    };
  }
</script>

<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
  <!-- Control Panel -->
  <div class="lg:col-span-1 space-y-4">
    <div class="bg-muted/50 border border-border rounded-xl p-5">
      <h2 class="text-lg font-bold text-foreground mb-4">Run Pipeline</h2>
      <p class="text-sm text-muted-foreground mb-6">Execute the seeding process directly from the UI. Watch the logs stream in real-time.</p>

      <Button onclick={() => runSeed('update')} disabled={isRunning} class="w-full mb-3">
        {#if isRunning && currentAction === 'update'}
          <span class="animate-spin mr-2" role="status" aria-label="Loading">⏳</span>
        {:else}
          <span class="mr-2" aria-hidden="true">▶</span>
        {/if}
        Run Seed
      </Button>

      <div class="my-5 border-t border-border relative">
        <span class="absolute left-1/2 -top-3 -translate-x-1/2 bg-muted/50 px-2 text-xs text-muted-foreground font-medium">DANGER ZONE</span>
      </div>

      <Button onclick={() => runSeed('clean-only')} disabled={isRunning} variant="destructive" class="w-full flex items-center justify-center gap-2">
        {#if isRunning && currentAction === 'clean-only'}
          <span class="animate-spin mr-2" role="status" aria-label="Loading">⏳</span>
        {:else}
          <span class="mr-2" aria-hidden="true">🗑️</span>
        {/if}
        Wipe DB
      </Button>
    </div>

    <div class="bg-muted/50 border border-border rounded-xl p-5">
      <h2 class="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Status</h2>
      <div class="flex items-center gap-3">
        <div class="w-3 h-3 rounded-full {isRunning ? 'bg-warning animate-pulse' : 'bg-success'}"></div>
        <span class="text-sm font-medium">{isRunning ? 'Pipeline Running...' : 'Idle'}</span>
      </div>
    </div>

    <!-- Execution Sequence -->
    <div class="bg-card border border-border rounded-xl p-5">
      <h2 class="text-sm font-bold text-foreground mb-4">Execution Sequence</h2>
      <div class="relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
        <div class="space-y-4 relative">
          <div class="flex items-center gap-3 text-sm">
            <div class="w-4 h-4 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-[10px] z-10 text-primary font-bold">1</div>
            <span class="text-foreground">Logos & Assets</span>
          </div>
          <div class="flex items-center gap-3 text-sm">
            <div class="w-4 h-4 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-[10px] z-10 text-primary font-bold">2</div>
            <span class="text-foreground">Taxonomy (Categories)</span>
          </div>
          <div class="flex items-center gap-3 text-sm">
            <div class="w-4 h-4 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-[10px] z-10 text-primary font-bold">3</div>
            <span class="text-muted-foreground">Products & Plans</span>
          </div>
          <div class="flex items-center gap-3 text-sm">
            <div class="w-4 h-4 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-[10px] z-10 text-primary font-bold">4</div>
            <span class="text-muted-foreground">Support (FAQs, Testimonials)</span>
          </div>
          <div class="flex items-center gap-3 text-sm">
            <div class="w-4 h-4 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-[10px] z-10 text-primary font-bold">5</div>
            <span class="text-muted-foreground">Content (Articles)</span>
          </div>
          <div class="flex items-center gap-3 text-sm">
            <div class="w-4 h-4 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] z-10 text-muted-foreground font-bold">6</div>
            <span class="text-muted-foreground">Single Types (Global, Footer)</span>
          </div>
          <div class="flex items-center gap-3 text-sm">
            <div class="w-4 h-4 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] z-10 text-muted-foreground font-bold">7</div>
            <span class="text-muted-foreground">Dynamic Pages Builder</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Terminal Window -->
  <div class="lg:col-span-3">
    <div class="rounded-xl overflow-hidden flex flex-col h-[600px] shadow-2xl bg-card border border-border">
      <div class="bg-muted px-4 py-3 flex items-center justify-between border-b border-border">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-destructive/80"></div>
          <div class="w-3 h-3 rounded-full bg-warning/80"></div>
          <div class="w-3 h-3 rounded-full bg-success/80"></div>
          <span class="ml-3 text-xs font-mono text-muted-foreground">node scripts/seed-from-csv.mjs</span>
        </div>
        <Button variant="outline" size="sm" onclick={() => logs = []} class="h-8">Clear</Button>
      </div>
      <div class="p-4 overflow-y-auto flex-1 font-mono text-sm" bind:this={logContainer}>
        {#if logs.length === 0}
          <div class="text-muted-foreground italic">Waiting for pipeline execution...</div>
        {/if}
        {#each logs as log}
          <div class="mb-1 {getLogColor(log)}">{log}</div>
        {/each}
      </div>
    </div>
  </div>
</div>
