<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchSeedFiles, fetchSeedFile, parseCSV, submitArticle, appendCsvRow } from '$lib/api';
  
  import { Button } from '$lib/components/ui/button/index.js';
  import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
  import { Root as Table, Body as TableBody, Cell as TableCell, Head as TableHead, Header as TableHeader, Row as TableRow } from '$lib/components/ui/table/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import * as Alert from '$lib/components/ui/alert/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Textarea } from '$lib/components/ui/textarea/index.js';

  // State
  let apiToken = $state('');
  type WizardStep = 'select-method' | 'csv-review' | 'csv-pipeline' | 'backup-pipeline' | 'ondemand';
  let wizardStep = $state<WizardStep>('select-method');
  let files = $state<string[]>([]);
  let selectedFile = $state('');
  let fileContent = $state('');
  let isLoadingFile = $state(false);
  let fileContentError = $state('');
  let csvData = $state({ headers: [] as string[], rows: [] as string[][] });

  // Preview State
  let backupPreview = $state<any>(null);
  let isLoadingPreview = $state(false);
  let selectedPreviewType = $state('');
  let selectedPreviewItems = $state<any[]>([]);
  let isPreviewModalOpen = $state(false);

  function openPreviewModal(type: string, items: any[]) {
    selectedPreviewType = type;
    selectedPreviewItems = items;
    isPreviewModalOpen = true;
  }

  // Pipeline State
  let isRunning = $state(false);
  let currentAction = $state('');
  let logs = $state<string[]>([]);
  let logContainer: HTMLElement | null = $state(null);

  // On-Demand Form State
  let form = $state({ title: '', slug: '', category: 'Technology', description: '', content: '' });
  let isSubmitting = $state(false);
  let formMessage = $state('');
  let formStatus = $state('');

  let newCsvRow: string[] = $state([]);
  let isAddingRow = $state(false);

  async function loadFiles() {
    try {
      files = await fetchSeedFiles();
      files.sort();
    } catch (e) {
      console.error(e);
    }
  }

  async function viewFile(path: string) {
    selectedFile = path;
    isLoadingFile = true;
    fileContentError = '';
    fileContent = '';
    try {
      const text = await fetchSeedFile(path);
      fileContent = text;
      if (path.endsWith('.csv')) {
        csvData = parseCSV(text);
        newCsvRow = new Array(csvData.headers.length).fill('');
      }
    } catch (e: unknown) {
      fileContentError = (e as Error).message;
    } finally {
      isLoadingFile = false;
    }
  }

  async function handleAddRow() {
    if (!selectedFile || !selectedFile.endsWith('.csv')) return;
    isAddingRow = true;
    try {
      await appendCsvRow(selectedFile, newCsvRow);
      await viewFile(selectedFile);
    } catch (e: unknown) {
      alert('Failed to add row: ' + (e as Error).message);
    } finally {
      isAddingRow = false;
    }
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

  let restoreContent = $state(true);
  let restoreFiles = $state(true);
  let restoreConfig = $state(true);

  function runBackupRestore() {
    if (isRunning) return;
    
    if (!confirm('🚨 NGUY HIỂM: Quá trình khôi phục sẽ xóa sạch toàn bộ cơ sở dữ liệu và thư viện media hiện tại của bạn!\n\nBạn có chắc chắn muốn tiếp tục không?')) {
      return;
    }

    isRunning = true;
    currentAction = 'restore';
    logs = ['> Starting Strapi Backup Restore...'];
    
    const options = [];
    if (restoreContent) options.push('content');
    if (restoreFiles) options.push('files');
    if (restoreConfig) options.push('config');
    const onlyQuery = options.length > 0 && options.length < 3 ? `only=${options.join(',')}` : '';

    let queryParams = [];
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

  async function handleSubmitArticle(e: Event) {
    e.preventDefault();
    isSubmitting = true;
    formMessage = '';
    try {
      const data = await submitArticle(form, apiToken);
      formStatus = 'success';
      formMessage = `Article created successfully! (ID: ${data.id})`;
      form = { title: '', slug: '', category: 'Technology', description: '', content: '' };
      loadFiles();
    } catch (err: unknown) {
      formStatus = 'error';
      formMessage = `Error: ${(err as Error).message}`;
    } finally {
      isSubmitting = false;
    }
  }

  onMount(() => {
    const saved = localStorage.getItem('strapi_token');
    if (saved) apiToken = saved;
    loadFiles();
  });

  $effect(() => {
    if (apiToken) {
      localStorage.setItem('strapi_token', apiToken);
    } else {
      localStorage.removeItem('strapi_token');
    }
  });

  $effect(() => {
    if (wizardStep === 'backup-pipeline' && !backupPreview && !isLoadingPreview) {
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
  });
</script>

<div class="min-h-screen bg-background text-foreground selection:bg-primary selection:text-foreground font-sans p-6">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <header class="flex items-center gap-4 mb-8">
      <div class="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-sm">
        <span class="text-2xl" aria-hidden="true">🚀</span>
      </div>
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground">LaunchPad Seed Studio</h1>
        <p class="text-sm text-muted-foreground">AI Content Seeding Visualization & On-Demand Editor</p>
      </div>
      <form class="ml-auto flex items-center gap-3" onsubmit={(e) => e.preventDefault()}>
        <Label class="text-muted-foreground text-xs font-semibold uppercase tracking-wider">API Token</Label>
        <Input type="password" bind:value={apiToken} placeholder="Strapi Admin Token (Mặc định lấy từ .env)" class="w-72" />
      </form>
    </header>

    <!-- Stepper Navigation -->
    {#if wizardStep !== 'select-method'}
      <div class="mb-8 flex items-center gap-3 text-sm font-medium text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border">
        <button class="hover:text-foreground transition-colors" onclick={() => wizardStep = 'select-method'}>🏠 Home</button>
        
        {#if wizardStep === 'csv-review' || wizardStep === 'csv-pipeline'}
          <span class="text-border">/</span>
          <button class="hover:text-foreground transition-colors {wizardStep === 'csv-review' ? 'text-primary' : ''}" onclick={() => wizardStep = 'csv-review'}>1. Review Data</button>
          <span class="text-border">/</span>
          <button class="hover:text-foreground transition-colors {wizardStep === 'csv-pipeline' ? 'text-primary' : ''}" onclick={() => wizardStep = 'csv-pipeline'}>2. Run Pipeline</button>
        {/if}

        {#if wizardStep === 'backup-pipeline'}
          <span class="text-border">/</span>
          <span class="text-primary">1. Restore Backup</span>
        {/if}

        {#if wizardStep === 'ondemand'}
          <span class="text-border">/</span>
          <span class="text-primary">On-Demand Article</span>
        {/if}
      </div>
    {/if}

    <!-- STEP: Select Method -->
    {#if wizardStep === 'select-method'}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-12">
        <!-- Card 1: Backup -->
        <button onclick={() => wizardStep = 'backup-pipeline'} class="text-left bg-card hover:bg-muted/50 border border-border rounded-xl p-6 transition-all shadow-sm hover:shadow-md group flex flex-col items-start gap-4">
          <div class="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            <span aria-hidden="true">📦</span>
          </div>
          <div>
            <h2 class="text-xl font-bold text-foreground mb-2">Restore Backup</h2>
            <p class="text-muted-foreground text-sm leading-relaxed">Restore a full Strapi snapshot from a .tar.gz archive. Best for setting up a fresh environment identically to production.</p>
          </div>
        </button>

        <!-- Card 2: CSV -->
        <button onclick={() => wizardStep = 'csv-review'} class="text-left bg-card hover:bg-muted/50 border border-border rounded-xl p-6 transition-all shadow-sm hover:shadow-md group flex flex-col items-start gap-4">
          <div class="w-12 h-12 bg-success/10 text-success rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            <span aria-hidden="true">📄</span>
          </div>
          <div>
            <h2 class="text-xl font-bold text-foreground mb-2">Seed Step-by-Step</h2>
            <p class="text-muted-foreground text-sm leading-relaxed">Review local CSV data and run the multi-step seeding pipeline. Great for incremental updates and content modeling.</p>
          </div>
        </button>
      </div>
      
      <div class="flex justify-center mt-12">
        <Button variant="outline" onclick={() => wizardStep = 'ondemand'}>
          <span class="mr-2" aria-hidden="true">📝</span> Quick On-Demand Article
        </Button>
      </div>
    {/if}

    <!-- STEP: CSV Review -->
    {#if wizardStep === 'csv-review'}
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
        <!-- File Tree -->
        <div class="lg:col-span-1 bg-muted/50 border border-border rounded-xl flex flex-col overflow-hidden">
          <div class="bg-muted px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 class="font-bold text-foreground">Seed Files</h3>
            <Button variant="outline" size="sm" onclick={loadFiles} class="h-8">Refresh</Button>
          </div>
          <ScrollArea class="flex-1 p-2">
            {#if files.length === 0}
              <div class="text-sm text-muted-foreground p-2">No files found. Is server.mjs running?</div>
            {/if}
            {#each files as file}
              <div role="button" tabindex="0" onclick={() => viewFile(file)} onkeydown={(e) => e.key === 'Enter' && viewFile(file)}
                   class="cursor-pointer text-sm py-2 px-3 rounded-md mb-1 truncate transition {selectedFile === file ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}">
                📄 {file}
              </div>
            {/each}
          </ScrollArea>
        </div>
        
        <!-- File Viewer -->
        <div class="lg:col-span-3 bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-2xl">
          <div class="bg-muted px-4 py-3 border-b border-border">
            <h3 class="font-mono text-sm text-muted-foreground">{selectedFile || 'Select a file to preview'}</h3>
          </div>
          <ScrollArea class="flex-1 bg-card">
            {#if !selectedFile}
              <div class="flex items-center justify-center h-[500px] text-muted-foreground">
                <span class="text-4xl opacity-20" role="img" aria-label="Select a file">👀</span>
              </div>
            {:else if isLoadingFile}
              <div class="flex items-center justify-center h-[500px] text-primary">
                <span class="animate-spin text-2xl" role="status" aria-label="Loading">⏳</span>
              </div>
            {:else if fileContentError}
              <div class="p-6 text-destructive font-mono">{fileContentError}</div>
            {:else if selectedFile.endsWith('.csv')}
              <div class="p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {#each csvData.headers as col}
                        <TableHead>{col}</TableHead>
                      {/each}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {#each csvData.rows as row}
                      <TableRow>
                        {#each row as col}
                          <TableCell class="whitespace-nowrap overflow-hidden text-ellipsis max-w-xs">{col}</TableCell>
                        {/each}
                      </TableRow>
                    {/each}
                  </TableBody>
                </Table>

                <div class="mt-4 border-t border-border pt-4 bg-muted/20 p-4 rounded-b-xl -mx-4 -mb-4">
                  <h4 class="text-sm font-medium mb-3 text-foreground">Quick Add Row</h4>
                  <div class="flex gap-2 flex-wrap items-end">
                    {#each csvData.headers as col, index}
                      <div class="flex-1 min-w-40">
                        <Label class="text-xs mb-1.5 block text-muted-foreground">{col}</Label>
                        <Input bind:value={newCsvRow[index]} class="text-xs" />
                      </div>
                    {/each}
                    <Button onclick={handleAddRow} disabled={isAddingRow} class="h-9">
                      {isAddingRow ? 'Adding...' : 'Add Row'}
                    </Button>
                  </div>
                </div>
              </div>
            {:else if selectedFile.endsWith('.json')}
              <div class="p-4">
                <pre class="font-mono text-sm leading-relaxed text-foreground overflow-x-auto"><code>{fileContent}</code></pre>
              </div>
            {:else}
              <div class="p-4">
                <pre class="font-mono text-sm leading-relaxed text-muted-foreground overflow-x-auto"><code>{fileContent}</code></pre>
              </div>
            {/if}
          </ScrollArea>
        </div>
      </div>
      <div class="mt-6 flex justify-end">
        <Button size="lg" onclick={() => wizardStep = 'csv-pipeline'}>Next: Run Pipeline ➔</Button>
      </div>
    {/if}

    <!-- STEP: CSV Pipeline -->
    {#if wizardStep === 'csv-pipeline'}
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
    {/if}

    <!-- STEP: Backup Pipeline -->
    {#if wizardStep === 'backup-pipeline'}
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
    {/if}

    <!-- STEP: On-Demand -->
    {#if wizardStep === 'ondemand'}
      <div class="max-w-3xl mx-auto">
        <div class="bg-muted/50 border border-border rounded-2xl p-8 shadow-xl">
          <h2 class="text-2xl font-bold text-foreground mb-2">Create Article On-Demand</h2>
          <p class="text-muted-foreground mb-8">Push a new article directly to Strapi without modifying CSV files manually.</p>

          <form onsubmit={handleSubmitArticle} class="space-y-6">
            <div>
              <Label class="text-foreground mb-2 block">Title <span class="text-destructive">*</span></Label>
              <Input bind:value={form.title} required placeholder="e.g. 5 Trends in AI Data Analysis" />
            </div>

            <div class="grid grid-cols-2 gap-6">
              <div>
                <Label class="text-foreground mb-2 block">Slug</Label>
                <Input bind:value={form.slug} placeholder="auto-generated-if-empty" />
              </div>
              <div>
                <Label id="category-label" class="text-foreground mb-2 block">Category</Label>
                <Select.Root type="single" bind:value={form.category}>
                  <Select.Trigger aria-labelledby="category-label">
                    {form.category}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="Technology">Technology</Select.Item>
                    <Select.Item value="Business">Business</Select.Item>
                    <Select.Item value="Lifestyle">Lifestyle</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
            </div>

            <div>
              <Label class="text-foreground mb-2 block">Description</Label>
              <Input bind:value={form.description} placeholder="A short catchy summary..." />
            </div>

            <div>
              <Label id="content-label" class="text-foreground mb-2 block">Content (Markdown / Text)</Label>
              <Textarea bind:value={form.content} rows={6} placeholder="Write your article content here..." aria-labelledby="content-label" />
            </div>

            {#if formMessage}
              <Alert.Root variant={formStatus === 'success' ? 'default' : 'destructive'} class={formStatus === 'success' ? 'bg-success/10 text-success border-success/20' : ''}>
                <Alert.Description>{formMessage}</Alert.Description>
              </Alert.Root>
            {/if}

            <Button type="submit" disabled={isSubmitting} size="lg" class="w-full">
              {isSubmitting ? 'Publishing...' : 'Publish to Strapi'}
            </Button>
          </form>
        </div>
      </div>
    {/if}
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
</div>
