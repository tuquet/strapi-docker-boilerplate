<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import * as Alert from '$lib/components/ui/alert/index.js';

  interface Props {
    apiToken: string;
  }

  let { apiToken = $bindable() }: Props = $props();

  // Settings State
  let showToken = $state(false);
  let connectionStatus = $state<'idle' | 'testing' | 'success' | 'error'>('idle');
  let connectionMessage = $state('');
  let strapiUrl = $state(import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337');
  let selectedTheme = $state<'dark' | 'light' | 'auto'>('dark');

  function handleTokenChange(value: string) {
    apiToken = value;
    if (value) {
      localStorage.setItem('strapi_token', value);
    } else {
      localStorage.removeItem('strapi_token');
    }
  }

  async function testConnection() {
    connectionStatus = 'testing';
    connectionMessage = '';
    try {
      const headers: Record<string, string> = {};
      if (apiToken) headers['Authorization'] = `Bearer ${apiToken}`;

      const res = await fetch('/api/seed-files');
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (data.success) {
        connectionStatus = 'success';
        connectionMessage = `Connected successfully! Found ${data.files?.length || 0} seed files.`;
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: unknown) {
      connectionStatus = 'error';
      connectionMessage = `Connection failed: ${(err as Error).message}`;
    }
  }

  function clearToken() {
    apiToken = '';
    localStorage.removeItem('strapi_token');
  }
</script>

<div class="max-w-2xl mx-auto space-y-6">
  <!-- API Token -->
  <div class="bg-card border border-border rounded-xl p-6 shadow-sm">
    <h2 class="text-lg font-bold text-foreground mb-1">API Token</h2>
    <p class="text-sm text-muted-foreground mb-5">Your Strapi admin API token. Stored in browser localStorage for convenience.</p>

    <div class="space-y-4">
      <div>
        <Label class="text-foreground mb-2 block text-sm">Token</Label>
        <div class="flex gap-2">
          <Input
            type={showToken ? 'text' : 'password'}
            value={apiToken}
            oninput={(e: Event) => handleTokenChange((e.target as HTMLInputElement).value)}
            placeholder="Strapi Admin Token (Mặc định lấy từ .env)"
            class="flex-1"
          />
          <Button variant="outline" size="sm" onclick={() => showToken = !showToken} class="shrink-0 w-20">
            {showToken ? 'Hide' : 'Show'}
          </Button>
          {#if apiToken}
            <Button variant="outline" size="sm" onclick={clearToken} class="shrink-0 text-destructive hover:text-destructive">
              Clear
            </Button>
          {/if}
        </div>
      </div>

      <div class="flex items-center gap-3">
        <Button variant="outline" onclick={testConnection} disabled={connectionStatus === 'testing'}>
          {#if connectionStatus === 'testing'}
            <span class="animate-spin mr-2" role="status">⏳</span>
          {:else}
            <span class="mr-2" aria-hidden="true">🔌</span>
          {/if}
          Test Connection
        </Button>
        {#if connectionStatus === 'success'}
          <span class="text-sm text-success font-medium">✓ Connected</span>
        {:else if connectionStatus === 'error'}
          <span class="text-sm text-destructive font-medium">✕ Failed</span>
        {/if}
      </div>

      {#if connectionMessage}
        <Alert.Root variant={connectionStatus === 'success' ? 'default' : 'destructive'} class={connectionStatus === 'success' ? 'bg-success/10 text-success border-success/20' : ''}>
          <Alert.Description>{connectionMessage}</Alert.Description>
        </Alert.Root>
      {/if}
    </div>
  </div>

  <!-- Strapi URL -->
  <div class="bg-card border border-border rounded-xl p-6 shadow-sm">
    <h2 class="text-lg font-bold text-foreground mb-1">Strapi URL</h2>
    <p class="text-sm text-muted-foreground mb-5">The Strapi instance this studio connects to. Configured via environment variables.</p>

    <div class="bg-muted/50 border border-border rounded-lg px-4 py-3 font-mono text-sm text-foreground flex items-center gap-2">
      <span class="text-muted-foreground">URL:</span>
      <span>{strapiUrl}</span>
    </div>
  </div>

  <!-- Theme -->
  <div class="bg-card border border-border rounded-xl p-6 shadow-sm">
    <h2 class="text-lg font-bold text-foreground mb-1">Appearance</h2>
    <p class="text-sm text-muted-foreground mb-5">Customize the look and feel of Seed Studio.</p>

    <div>
      <Label class="text-foreground mb-3 block text-sm">Theme</Label>
      <div class="flex gap-2">
        <Button
          variant={selectedTheme === 'dark' ? 'default' : 'outline'}
          size="sm"
          onclick={() => selectedTheme = 'dark'}
        >
          🌙 Dark
        </Button>
        <Button
          variant={selectedTheme === 'light' ? 'default' : 'outline'}
          size="sm"
          onclick={() => selectedTheme = 'light'}
        >
          ☀️ Light
        </Button>
        <Button
          variant={selectedTheme === 'auto' ? 'default' : 'outline'}
          size="sm"
          onclick={() => selectedTheme = 'auto'}
        >
          💻 Auto
        </Button>
      </div>
      <p class="text-xs text-muted-foreground mt-2 italic">Theme switching coming soon. Currently defaults to dark mode.</p>
    </div>
  </div>

  <!-- About -->
  <div class="bg-card border border-border rounded-xl p-6 shadow-sm">
    <h2 class="text-lg font-bold text-foreground mb-1">About</h2>
    <p class="text-sm text-muted-foreground mb-5">Seed Studio version and build information.</p>

    <div class="grid grid-cols-2 gap-4 text-sm">
      <div>
        <span class="text-muted-foreground">Version</span>
        <div class="font-bold text-foreground mt-1">v2.0.0</div>
      </div>
      <div>
        <span class="text-muted-foreground">Framework</span>
        <div class="font-bold text-foreground mt-1">Svelte 5 + Vite</div>
      </div>
      <div>
        <span class="text-muted-foreground">UI Library</span>
        <div class="font-bold text-foreground mt-1">shadcn-svelte</div>
      </div>
      <div>
        <span class="text-muted-foreground">CSS</span>
        <div class="font-bold text-foreground mt-1">Tailwind CSS 4</div>
      </div>
    </div>
  </div>
</div>
