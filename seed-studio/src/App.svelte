<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchSeedFiles, fetchSeedFile, parseCSV, submitArticle, appendCsvRow } from '$lib/api';
  
  import { Root as Tabs, Content as TabsContent, List as TabsList, Trigger as TabsTrigger } from '$lib/components/ui/tabs/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
  import { Root as Table, Body as TableBody, Cell as TableCell, Head as TableHead, Header as TableHeader, Row as TableRow } from '$lib/components/ui/table/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';

  // State
  let apiToken = $state('');
  let activeTab = $state('explorer');
  let files = $state<string[]>([]);
  let selectedFile = $state('');
  let fileContent = $state('');
  let isLoadingFile = $state(false);
  let fileContentError = $state('');
  let csvData = $state({ headers: [] as string[], rows: [] as string[][] });

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
    } catch (e: any) {
      fileContentError = e.message;
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
    } catch (e: any) {
      alert('Failed to add row: ' + e.message);
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
    if (l.includes('error')) return 'text-red-400';
    if (l.includes('success')) return 'text-green-400';
    if (l.includes('skip')) return 'text-yellow-400';
    if (l.includes('info')) return 'text-blue-400';
    if (l.startsWith('>')) return 'text-brand font-bold mt-2';
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
    } catch (err: any) {
      formStatus = 'error';
      formMessage = `Error: ${err.message}`;
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
</script>

<div class="min-h-screen bg-background text-foreground selection:bg-primary selection:text-foreground font-sans p-6">
  <div class="max-w-[1400px] mx-auto">
    <!-- Header -->
    <header class="flex items-center gap-4 mb-8">
      <div class="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-sm">
        <span class="text-2xl">🚀</span>
      </div>
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground">LaunchPad Seed Studio</h1>
        <p class="text-sm text-muted-foreground">AI Content Seeding Visualization & On-Demand Editor</p>
      </div>
      <form class="ml-auto flex items-center gap-3" onsubmit={(e) => e.preventDefault()}>
        <Label class="text-muted-foreground text-xs font-semibold uppercase tracking-wider">API Token</Label>
        <Input type="password" bind:value={apiToken} placeholder="Strapi Admin Token (Mặc định lấy từ .env)" class="w-[300px] h-9 bg-muted border-border focus-visible:ring-primary" />
      </form>
    </header>

    <Tabs bind:value={activeTab} class="w-full">
      <TabsList class="mb-6 bg-transparent border-b border-border rounded-none w-full justify-start h-auto p-0 gap-6">
        <TabsTrigger value="explorer" class="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3 text-muted-foreground hover:text-foreground">
          Data Explorer
        </TabsTrigger>
        <TabsTrigger value="pipeline" class="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3 text-muted-foreground hover:text-foreground">
          Pipeline Visualizer
        </TabsTrigger>
        <TabsTrigger value="ondemand" class="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3 text-muted-foreground hover:text-foreground">
          On-Demand Article
        </TabsTrigger>
      </TabsList>

      <TabsContent value="explorer" class="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px] mt-0">
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
              <div class="flex items-center justify-center h-[500px] text-gray-600">
                <span class="text-4xl opacity-20">👀</span>
              </div>
            {:else if isLoadingFile}
              <div class="flex items-center justify-center h-[500px] text-primary">
                <span class="animate-spin text-2xl">⏳</span>
              </div>
            {:else if fileContentError}
              <div class="p-6 text-red-400 font-mono">{fileContentError}</div>
            {:else if selectedFile.endsWith('.csv')}
              <div class="p-4">
                <Table>
                  <TableHeader>
                    <TableRow class="border-border/50 hover:bg-transparent">
                      {#each csvData.headers as col}
                        <TableHead class="text-muted-foreground border border-border">{col}</TableHead>
                      {/each}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {#each csvData.rows as row}
                      <TableRow class="border-b border-border/50 hover:bg-muted/50">
                        {#each row as col}
                          <TableCell class="border-l border-r border-border/50 whitespace-nowrap overflow-hidden text-ellipsis max-w-xs text-foreground">{col}</TableCell>
                        {/each}
                      </TableRow>
                    {/each}
                  </TableBody>
                </Table>

                <div class="mt-4 border-t border-border pt-4 bg-muted/20 p-4 rounded-b-xl -mx-4 -mb-4">
                  <h4 class="text-sm font-medium mb-3 text-foreground">Quick Add Row</h4>
                  <div class="flex gap-2 flex-wrap items-end">
                    {#each csvData.headers as col, index}
                      <div class="flex-1 min-w-[150px]">
                        <Label class="text-xs mb-1.5 block text-muted-foreground">{col}</Label>
                        <Input bind:value={newCsvRow[index]} class="h-9 text-xs bg-background" />
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
                <pre class="font-mono text-[13px] leading-relaxed text-foreground overflow-x-auto"><code>{fileContent}</code></pre>
              </div>
            {:else}
              <div class="p-4">
                <pre class="font-mono text-[13px] leading-relaxed text-muted-foreground overflow-x-auto"><code>{fileContent}</code></pre>
              </div>
            {/if}
          </ScrollArea>
        </div>
      </TabsContent>

      <TabsContent value="pipeline" class="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-0">
        <!-- Control Panel -->
        <div class="lg:col-span-1 space-y-4">
          <div class="bg-muted/50 border border-border rounded-xl p-5">
            <h2 class="text-lg font-bold text-foreground mb-4">Run Pipeline</h2>
            <p class="text-sm text-muted-foreground mb-6">Execute the seeding process directly from the UI. Watch the logs stream in real-time.</p>

            <Button onclick={() => runSeed('update')} disabled={isRunning} class="w-full mb-3">
              {#if isRunning && currentAction === 'update'}
                <span class="animate-spin mr-2">⏳</span>
              {:else}
                <span class="mr-2">▶</span>
              {/if}
              Run Seed
            </Button>

            <div class="my-5 border-t border-border relative">
              <span class="absolute left-1/2 -top-3 -translate-x-1/2 bg-muted/50 px-2 text-xs text-muted-foreground font-medium">DANGER ZONE</span>
            </div>

            <Button onclick={() => runSeed('clean-only')} disabled={isRunning} variant="destructive" class="w-full flex items-center justify-center gap-2">
              {#if isRunning && currentAction === 'clean-only'}
                <span class="animate-spin mr-2">⏳</span>
              {:else}
                <span class="mr-2">🗑️</span>
              {/if}
              Wipe DB
            </Button>
          </div>

          <div class="bg-muted/50 border border-border rounded-xl p-5">
            <h2 class="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Status</h2>
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full {isRunning ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}"></div>
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
                <div class="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div class="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div class="w-3 h-3 rounded-full bg-green-500/80"></div>
                <span class="ml-3 text-xs font-mono text-muted-foreground">node scripts/seed-from-csv.mjs</span>
              </div>
              <Button variant="outline" size="sm" onclick={() => logs = []} class="h-8">Clear</Button>
            </div>
            <div class="p-4 overflow-y-auto flex-1 font-mono text-sm" bind:this={logContainer}>
              {#if logs.length === 0}
                <div class="text-gray-600 italic">Waiting for pipeline execution...</div>
              {/if}
              {#each logs as log}
                <div class="mb-1 {getLogColor(log)}">{log}</div>
              {/each}
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="ondemand" class="max-w-3xl mx-auto mt-0">
        <div class="bg-muted/50 border border-border rounded-2xl p-8 shadow-xl">
          <h2 class="text-2xl font-bold text-foreground mb-2">Create Article On-Demand</h2>
          <p class="text-muted-foreground mb-8">Push a new article directly to Strapi without modifying CSV files manually.</p>

          <form onsubmit={handleSubmitArticle} class="space-y-6">
            <div>
              <Label class="text-foreground mb-2 block">Title <span class="text-red-400">*</span></Label>
              <Input bind:value={form.title} required class="bg-background border-border text-foreground focus-visible:ring-ring" placeholder="e.g. 5 Trends in AI Data Analysis" />
            </div>

            <div class="grid grid-cols-2 gap-6">
              <div>
                <Label class="text-foreground mb-2 block">Slug</Label>
                <Input bind:value={form.slug} class="bg-background border-border text-foreground focus-visible:ring-ring" placeholder="auto-generated-if-empty" />
              </div>
              <div>
                <Label class="text-foreground mb-2 block">Category</Label>
                <select bind:value={form.category} class="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="Technology">Technology</option>
                  <option value="Business">Business</option>
                  <option value="Lifestyle">Lifestyle</option>
                </select>
              </div>
            </div>

            <div>
              <Label class="text-foreground mb-2 block">Description</Label>
              <Input bind:value={form.description} class="bg-background border-border text-foreground focus-visible:ring-ring" placeholder="A short catchy summary..." />
            </div>

            <div>
              <Label class="text-foreground mb-2 block">Content (Markdown / Text)</Label>
              <textarea bind:value={form.content} rows="6" class="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" placeholder="Write your article content here..."></textarea>
            </div>

            {#if formMessage}
              <div class="p-3 rounded-lg text-sm {formStatus === 'success' ? 'bg-green-900/30 text-green-400 border border-green-900/50' : 'bg-red-900/30 text-red-400 border border-red-900/50'}">
                {formMessage}
              </div>
            {/if}

            <Button type="submit" disabled={isSubmitting} size="lg" class="w-full">
              {isSubmitting ? 'Publishing...' : 'Publish to Strapi'}
            </Button>
          </form>
        </div>
      </TabsContent>
    </Tabs>
  </div>
</div>
