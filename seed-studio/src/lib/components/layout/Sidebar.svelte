<script lang="ts">
	import { cn } from '$lib/utils.js';
	import {
		LayoutDashboard,
		FileText,
		PenSquare,
		Database,
		Play,
		Archive,
		ImageIcon,
		Settings,
		ChevronLeft,
		ChevronRight,
		Sprout,
	} from '@lucide/svelte';
	import type { Component } from 'svelte';

	interface NavItem {
		label: string;
		href: string;
		icon: Component;
	}

	interface Props {
		collapsed?: boolean;
		currentRoute?: string;
	}

	let { collapsed = $bindable(false), currentRoute = '' }: Props = $props();

	const navItems: NavItem[] = [
		{ label: 'Dashboard', href: '#/dashboard', icon: LayoutDashboard },
		{ label: 'Content Explorer', href: '#/content-explorer', icon: FileText },
		{ label: 'Article Editor', href: '#/article-editor', icon: PenSquare },
		{ label: 'Seed Data', href: '#/seed-data', icon: Database },
		{ label: 'Pipeline', href: '#/pipeline', icon: Play },
		{ label: 'Backup & Restore', href: '#/backup', icon: Archive },
		{ label: 'Media Library', href: '#/media', icon: ImageIcon },
		{ label: 'Settings', href: '#/settings', icon: Settings },
	];

	function isActive(href: string): boolean {
		return currentRoute === href || currentRoute.startsWith(href + '/');
	}

	function toggleCollapse() {
		collapsed = !collapsed;
	}
</script>

<aside
	class={cn(
		'flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out',
		collapsed ? 'w-16' : 'w-[260px]'
	)}
>
	<!-- Logo -->
	<div class="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
		<div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
			<Sprout class="size-4" />
		</div>
		{#if !collapsed}
			<span class="truncate text-sm font-semibold tracking-tight">Seed Studio</span>
		{/if}
	</div>

	<!-- Navigation -->
	<nav class="flex-1 overflow-y-auto px-2 py-3">
		<ul class="flex flex-col gap-0.5">
			{#each navItems as item (item.href)}
				{@const active = isActive(item.href)}
				<li>
					<a
						href={item.href}
						class={cn(
							'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
							active
								? 'bg-sidebar-accent text-sidebar-accent-foreground'
								: 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
						)}
						title={collapsed ? item.label : undefined}
					>
						<item.icon class="size-4 shrink-0" />
						{#if !collapsed}
							<span class="truncate">{item.label}</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<!-- Footer -->
	<div class="flex flex-col gap-1 border-t border-sidebar-border px-2 py-3">
		{#if !collapsed}
			<span class="px-3 text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/40">
				v2.0.0
			</span>
		{/if}

		<button
			onclick={toggleCollapse}
			class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
			title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
		>
			{#if collapsed}
				<ChevronRight class="size-4 shrink-0" />
			{:else}
				<ChevronLeft class="size-4 shrink-0" />
				<span class="truncate">Collapse</span>
			{/if}
		</button>
	</div>
</aside>
