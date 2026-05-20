<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Wifi, WifiOff, Loader2, KeyRound, Eye, EyeOff } from '@lucide/svelte';
	import { connectionStore } from '$lib/stores/connection.svelte';

	interface Props {
		currentRoute?: string;
		strapiStatus?: 'online' | 'offline' | 'checking';
	}

	let { currentRoute = '', strapiStatus = 'checking' }: Props = $props();

	let showToken = $state(false);

	const routeTitles: Record<string, string> = {
		'#/dashboard': 'Dashboard',
		'#/content-explorer': 'Content Explorer',
		'#/article-editor': 'Article Editor',
		'#/seed-data': 'Seed Data',
		'#/pipeline': 'Pipeline',
		'#/backup': 'Backup & Restore',
		'#/media': 'Media Library',
		'#/settings': 'Settings',
	};

	const pageTitle = $derived(routeTitles[currentRoute] ?? 'Seed Studio');

	const statusConfig = $derived.by(() => {
		switch (strapiStatus) {
			case 'online':
				return { color: 'bg-success', label: 'Connected', icon: Wifi };
			case 'offline':
				return { color: 'bg-destructive', label: 'Disconnected', icon: WifiOff };
			case 'checking':
			default:
				return { color: 'bg-warning', label: 'Checking...', icon: Loader2 };
		}
	});

	function handleTokenInput(e: Event) {
		const target = e.target as HTMLInputElement;
		connectionStore.apiToken = target.value;
	}
</script>

<header
	class="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background px-6"
>
	<!-- Left: Page title -->
	<h1 class="text-lg font-semibold tracking-tight text-foreground">
		{pageTitle}
	</h1>

	<!-- Right: Status + Token input -->
	<div class="flex items-center gap-4">
		<!-- Connection status -->
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<button
				onclick={() => connectionStore.checkConnection()}
				class="relative flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-muted"
				title="Click to refresh connection status"
			>
				<span
					class={cn('inline-block size-2 rounded-full', statusConfig.color)}
					aria-hidden="true"
				></span>
				{#if strapiStatus === 'checking'}
					<statusConfig.icon class="size-3.5 animate-spin text-muted-foreground" />
				{:else}
					<statusConfig.icon class="size-3.5" />
				{/if}
				<span class="hidden text-xs sm:inline">{statusConfig.label}</span>
			</button>
		</div>

		<!-- Separator -->
		<div class="h-5 w-px bg-border" aria-hidden="true"></div>

		<!-- API Token input -->
		<div class="flex items-center gap-2">
			<KeyRound class="size-3.5 text-muted-foreground" />
			<input
				type={showToken ? 'text' : 'password'}
				value={connectionStore.apiToken}
				oninput={handleTokenInput}
				placeholder="API Token"
				class="h-7 w-44 rounded-md border border-input bg-transparent px-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50"
			/>
			<button
				onclick={() => (showToken = !showToken)}
				class="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				title={showToken ? 'Hide token' : 'Show token'}
			>
				{#if showToken}
					<EyeOff class="size-3.5" />
				{:else}
					<Eye class="size-3.5" />
				{/if}
			</button>
		</div>
	</div>
</header>
