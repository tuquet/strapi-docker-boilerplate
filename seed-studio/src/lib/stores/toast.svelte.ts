/**
 * Toast notification store using Svelte 5 runes.
 * Supports auto-dismiss and multiple concurrent toasts.
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

const DEFAULT_DURATION = 4000;

let nextId = 0;

function createToastStore() {
  let items = $state<Toast[]>([]);
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function addToast(type: ToastType, message: string, duration: number = DEFAULT_DURATION): string {
    const id = `toast-${++nextId}`;
    const toast: Toast = { id, type, message, duration };

    items = [...items, toast];

    if (duration > 0) {
      const timer = setTimeout(() => {
        removeToast(id);
      }, duration);
      timers.set(id, timer);
    }

    return id;
  }

  function removeToast(id: string) {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
    items = items.filter((t) => t.id !== id);
  }

  function clearAll() {
    for (const timer of timers.values()) {
      clearTimeout(timer);
    }
    timers.clear();
    items = [];
  }

  return {
    get toasts(): Toast[] {
      return items;
    },
    addToast,
    removeToast,
    clearAll,
  };
}

export const toastStore = createToastStore();
