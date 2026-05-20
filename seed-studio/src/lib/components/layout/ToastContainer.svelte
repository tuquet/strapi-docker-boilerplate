<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { toastStore, type ToastType } from '$lib/stores/toast.svelte';
	import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from '@lucide/svelte';
	import type { Component } from 'svelte';

	interface ToastStyle {
		bg: string;
		border: string;
		icon: Component;
		iconColor: string;
		progressColor: string;
	}

	const styleMap: Record<ToastType, ToastStyle> = {
		success: {
			bg: 'bg-success/10',
			border: 'border-success/30',
			icon: CheckCircle2,
			iconColor: 'text-success',
			progressColor: 'bg-success',
		},
		error: {
			bg: 'bg-destructive/10',
			border: 'border-destructive/30',
			icon: AlertCircle,
			iconColor: 'text-destructive',
			progressColor: 'bg-destructive',
		},
		warning: {
			bg: 'bg-warning/10',
			border: 'border-warning/30',
			icon: AlertTriangle,
			iconColor: 'text-warning',
			progressColor: 'bg-warning',
		},
		info: {
			bg: 'bg-info/10',
			border: 'border-info/30',
			icon: Info,
			iconColor: 'text-info',
			progressColor: 'bg-info',
		},
	};
</script>

{#if toastStore.toasts.length > 0}
	<div
		class="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
		role="region"
		aria-label="Notifications"
	>
		{#each toastStore.toasts as toast (toast.id)}
			{@const style = styleMap[toast.type]}
			<div
				class={cn(
					'pointer-events-auto flex w-80 flex-col overflow-hidden rounded-lg border shadow-lg',
					style.bg,
					style.border,
					'animate-slide-in-right'
				)}
				role="alert"
			>
				<div class="flex items-start gap-3 px-4 py-3">
					<style.icon class={cn('mt-0.5 size-4 shrink-0', style.iconColor)} />
					<p class="flex-1 text-sm text-foreground">{toast.message}</p>
					<button
						onclick={() => toastStore.removeToast(toast.id)}
						class="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
						aria-label="Dismiss notification"
					>
						<X class="size-3.5" />
					</button>
				</div>

				<!-- Progress bar -->
				{#if toast.duration > 0}
					<div class="h-0.5 w-full bg-transparent">
						<div
							class={cn('h-full', style.progressColor)}
							style="animation: toast-progress {toast.duration}ms linear forwards;"
						></div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	@keyframes toast-progress {
		from {
			width: 100%;
		}
		to {
			width: 0%;
		}
	}

	:global(.animate-slide-in-right) {
		animation: slide-in-right 300ms ease-out;
	}

	@keyframes slide-in-right {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}
</style>
