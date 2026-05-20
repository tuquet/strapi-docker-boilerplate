<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchSeedFiles, fetchSeedFile, parseCSV, appendCsvRow } from '$lib/api';

  import { Button } from '$lib/components/ui/button/index.js';
  import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
  import { Root as Table, Body as TableBody, Cell as TableCell, Head as TableHead, Header as TableHeader, Row as TableRow } from '$lib/components/ui/table/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';

  interface Props {
    apiToken: string;
  }

  let { apiToken }: Props = $props();

  // State
  let files = $state<string[]>([]);
  let selectedFile = $state('');
  let fileContent = $state('');
  let isLoadingFile = $state(false);
  let fileContentError = $state('');
  let csvData = $state({ headers: [] as string[], rows: [] as string[][] });
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

  onMount(() => {
    loadFiles();
  });
</script>

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
