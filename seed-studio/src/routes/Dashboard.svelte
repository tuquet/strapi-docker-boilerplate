<script lang="ts">
  import { onMount } from 'svelte';
  import {
    FileText,
    Package,
    Tag,
    CreditCard,
    HelpCircle,
    Star,
    ImageIcon,
    FileStack,
    Wifi,
    WifiOff,
    Play,
    SquarePen,
    Archive,
    Database,
    RefreshCw,
    Loader2,
    type IconNode,
  } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button/index.js';

  // --- Props ---
  interface Props {
    apiToken: string;
  }
  let { apiToken }: Props = $props();

  // --- Types ---
  interface ContentStat {
    key: string;
    label: string;
    count: number;
    icon: IconNode;
    colorClass: string;
    bgClass: string;
  }

  interface StrapiStatus {
    online: boolean;
    url: string;
    contentTypes: number;
    lastCheck: string;
    error?: string;
  }

  // --- State ---
  let isLoadingStats = $state(true);
  let isLoadingStatus = $state(true);
  let isRefreshing = $state(false);
  let needsToken = $state(false);
  let refreshTimer: ReturnType<typeof setInterval> | undefined = $state(undefined);

  let rawCounts = $state<Record<string, number>>({
    articles: -1,
    products: -1,
    faqs: -1,
    logos: -1,
    categories: -1,
    plans: -1,
    testimonials: -1,
    pages: -1,
  });

  let strapiStatus = $state<StrapiStatus>({
    online: false,
    url: '—',
    contentTypes: 0,
    lastCheck: '—',
  });

  // --- Derived ---
  const statCards = $derived<ContentStat[]>([
    { key: 'articles', label: 'Articles', count: rawCounts.articles, icon: FileText, colorClass: 'text-info', bgClass: 'bg-info/10' },
    { key: 'products', label: 'Products', count: rawCounts.products, icon: Package, colorClass: 'text-success', bgClass: 'bg-success/10' },
    { key: 'faqs', label: 'FAQs', count: rawCounts.faqs, icon: HelpCircle, colorClass: 'text-warning', bgClass: 'bg-warning/10' },
    { key: 'logos', label: 'Logos', count: rawCounts.logos, icon: ImageIcon, colorClass: 'text-primary', bgClass: 'bg-primary/10' },
    { key: 'categories', label: 'Categories', count: rawCounts.categories, icon: Tag, colorClass: 'text-chart-2', bgClass: 'bg-chart-2/10' },
    { key: 'plans', label: 'Plans', count: rawCounts.plans, icon: CreditCard, colorClass: 'text-chart-4', bgClass: 'bg-chart-4/10' },
    { key: 'testimonials', label: 'Testimonials', count: rawCounts.testimonials, icon: Star, colorClass: 'text-chart-5', bgClass: 'bg-chart-5/10' },
    { key: 'pages', label: 'Pages', count: rawCounts.pages, icon: FileStack, colorClass: 'text-chart-3', bgClass: 'bg-chart-3/10' },
  ]);

  const statusDotClass = $derived(
    strapiStatus.online
      ? 'bg-success shadow-[0_0_8px_oklch(0.696_0.17_162.48/0.5)]'
      : isLoadingStatus
        ? 'bg-warning animate-pulse'
        : 'bg-destructive shadow-[0_0_8px_oklch(0.704_0.191_22.216/0.5)]'
  );

  const statusLabel = $derived(
    strapiStatus.online ? 'Online' : isLoadingStatus ? 'Checking…' : 'Offline'
  );

  // --- Data fetching ---
  async function fetchStats(): Promise<void> {
    try {
      const tokenQuery = apiToken ? `?token=${encodeURIComponent(apiToken)}` : '';
      const res = await fetch(`/api/content-stats${tokenQuery}`);
      if (res.status === 401) {
        needsToken = true;
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      needsToken = false;
      const data = await res.json();
      const stats = data.stats ?? data;
      rawCounts = {
        articles: stats.articles ?? -1,
        products: stats.products ?? -1,
        faqs: stats.faqs ?? -1,
        logos: stats.logos ?? -1,
        categories: stats.categories ?? -1,
        plans: stats.plans ?? -1,
        testimonials: stats.testimonials ?? -1,
        pages: stats.pages ?? -1,
      };
    } catch (err) {
      console.error('[Dashboard] Failed to fetch content stats:', err);
    } finally {
      isLoadingStats = false;
    }
  }

  async function fetchStatus(): Promise<void> {
    try {
      const tokenQuery = apiToken ? `?token=${encodeURIComponent(apiToken)}` : '';
      const res = await fetch(`/api/strapi-status${tokenQuery}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      strapiStatus = {
        online: data.status === 'online' || data.status === 'degraded',
        url: data.url ?? '—',
        contentTypes: data.contentTypes ?? 0,
        lastCheck: formatTimestamp(new Date()),
        error: data.error,
      };
    } catch (err) {
      console.error('[Dashboard] Failed to fetch strapi status:', err);
      strapiStatus = {
        online: false,
        url: strapiStatus.url,
        contentTypes: 0,
        lastCheck: formatTimestamp(new Date()),
        error: (err as Error).message,
      };
    } finally {
      isLoadingStatus = false;
    }
  }

  async function refreshAll(): Promise<void> {
    isRefreshing = true;
    await Promise.all([fetchStats(), fetchStatus()]);
    isRefreshing = false;
  }

  function formatTimestamp(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 5000) return 'just now';
    if (diffMs < 60000) return `${Math.floor(diffMs / 1000)}s ago`;
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
    return date.toLocaleTimeString();
  }

  function formatCount(count: number): string {
    return count === -1 ? '—' : count.toLocaleString();
  }

  // --- Quick actions ---
  const quickActions = [
    { label: 'Run Pipeline', hash: '#/pipeline', icon: Play, colorClass: 'text-success' },
    { label: 'Create Article', hash: '#/article-editor', icon: SquarePen, colorClass: 'text-info' },
    { label: 'Restore Backup', hash: '#/backup', icon: Archive, colorClass: 'text-warning' },
    { label: 'Browse Seed Data', hash: '#/seed-data', icon: Database, colorClass: 'text-primary' },
  ] as const;

  function navigate(hash: string): void {
    window.location.hash = hash;
  }

  // --- Lifecycle ---
  onMount(() => {
    fetchStats();
    fetchStatus();
    refreshTimer = setInterval(refreshAll, 60_000);
    return () => {
      if (refreshTimer) clearInterval(refreshTimer);
    };
  });
</script>

<div class="space-y-8">
  <!-- Welcome Header -->
  <div class="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-info/5 p-8">
    <div class="absolute -right-16 -top-16 size-64 rounded-full bg-primary/5 blur-3xl"></div>
    <div class="absolute -bottom-12 -left-12 size-48 rounded-full bg-info/5 blur-3xl"></div>
    <div class="relative flex items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-foreground">
          Welcome to Seed Studio
        </h1>
        <p class="mt-1.5 text-base text-muted-foreground">
          LaunchPad CMS Creative Console
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={isRefreshing}
        onclick={refreshAll}
        class="shrink-0"
      >
        {#if isRefreshing}
          <Loader2 class="size-4 animate-spin" data-icon="inline-start" />
        {:else}
          <RefreshCw class="size-4" data-icon="inline-start" />
        {/if}
        Refresh
      </Button>
    </div>
  </div>
  {#if needsToken}
    <div class="rounded-xl border border-warning/30 bg-warning/5 p-6">
      <div class="flex items-start gap-4">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning/10">
          <span class="text-xl">🔑</span>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-foreground">API Token Required</h3>
          <p class="mt-1 text-sm text-muted-foreground">
            Nhập Strapi Admin API Token ở thanh trên cùng (góc phải) để xem thống kê nội dung.
            Token có thể lấy từ <span class="font-mono text-xs">Strapi Admin → Settings → API Tokens</span>.
          </p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Stat Cards Grid -->
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {#each statCards as card (card.key)}
      {#if isLoadingStats}
        <!-- Skeleton Card -->
        <div class="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
          <div class="size-11 animate-pulse rounded-lg bg-muted"></div>
          <div class="flex-1 space-y-2">
            <div class="h-6 w-12 animate-pulse rounded bg-muted"></div>
            <div class="h-3.5 w-16 animate-pulse rounded bg-muted/60"></div>
          </div>
        </div>
      {:else}
        <!-- Stat Card -->
        <div class="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:bg-muted/50 hover:shadow-md">
          <div class="flex size-11 items-center justify-center rounded-lg {card.bgClass} transition-transform duration-200 group-hover:scale-110">
            <card.icon class="size-5 {card.colorClass}" />
          </div>
          <div>
            <p class="text-2xl font-bold tabular-nums {card.count === -1 ? 'text-muted-foreground' : 'text-foreground'}">
              {formatCount(card.count)}
            </p>
            <p class="text-sm text-muted-foreground">{card.label}</p>
          </div>
        </div>
      {/if}
    {/each}
  </div>

  <!-- Bottom Row: Connection Status + Quick Actions -->
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <!-- Strapi Connection Status -->
    <div class="rounded-xl border border-border bg-card p-6">
      <div class="mb-5 flex items-center gap-3">
        {#if strapiStatus.online}
          <Wifi class="size-5 text-success" />
        {:else}
          <WifiOff class="size-5 text-destructive" />
        {/if}
        <h2 class="text-lg font-semibold text-foreground">Strapi Connection</h2>
      </div>

      {#if isLoadingStatus}
        <!-- Skeleton Status -->
        <div class="space-y-4">
          {#each Array(4) as _}
            <div class="flex items-center justify-between">
              <div class="h-4 w-20 animate-pulse rounded bg-muted"></div>
              <div class="h-4 w-32 animate-pulse rounded bg-muted/60"></div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">Status</span>
            <span class="flex items-center gap-2 text-sm font-medium">
              <span class="inline-block size-2.5 rounded-full {statusDotClass}"></span>
              {statusLabel}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">URL</span>
            <span class="rounded bg-muted/50 px-2 py-0.5 font-mono text-sm text-foreground">
              {strapiStatus.url}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">Content Types</span>
            <span class="text-sm font-medium text-foreground">
              {strapiStatus.contentTypes}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">Last check</span>
            <span class="text-sm text-muted-foreground">
              {strapiStatus.lastCheck}
            </span>
          </div>
          {#if strapiStatus.error}
            <div class="mt-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {strapiStatus.error}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Quick Actions -->
    <div class="rounded-xl border border-border bg-card p-6">
      <div class="mb-5 flex items-center gap-3">
        <span class="text-lg">⚡</span>
        <h2 class="text-lg font-semibold text-foreground">Quick Actions</h2>
      </div>

      <div class="space-y-3">
        {#each quickActions as action}
          <button
            onclick={() => navigate(action.hash)}
            class="group flex w-full items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3 text-left transition-all duration-200 hover:border-primary/30 hover:bg-muted/50 hover:shadow-sm"
          >
            <div class="flex size-9 items-center justify-center rounded-md bg-muted transition-colors group-hover:bg-primary/10">
              <action.icon class="size-4 {action.colorClass} transition-transform duration-200 group-hover:scale-110" />
            </div>
            <span class="text-sm font-medium text-foreground">{action.label}</span>
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>
