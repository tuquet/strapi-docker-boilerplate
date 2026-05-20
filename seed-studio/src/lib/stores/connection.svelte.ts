/**
 * Connection store using Svelte 5 runes.
 * Manages API token persistence and Strapi connectivity status.
 */

export type StrapiStatus = 'online' | 'offline' | 'checking';

const STORAGE_KEY = 'seed-studio-api-token';
const CHECK_INTERVAL_MS = 30_000;

function loadToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function createConnectionStore() {
  let apiToken = $state<string>(loadToken());
  let strapiStatus = $state<StrapiStatus>('checking');
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  /** Persist token to localStorage whenever it changes */
  $effect(() => {
    try {
      if (apiToken) {
        localStorage.setItem(STORAGE_KEY, apiToken);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage may be unavailable (SSR, private browsing, etc.)
    }
  });

  async function checkConnection(): Promise<void> {
    strapiStatus = 'checking';
    try {
      const res = await fetch('/api/strapi-status', {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const data = (await res.json()) as { status?: string };
        strapiStatus =
          data.status === 'online' || data.status === 'degraded'
            ? 'online'
            : 'offline';
      } else {
        strapiStatus = 'offline';
      }
    } catch {
      strapiStatus = 'offline';
    }
  }

  function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }
    return headers;
  }

  function startPolling() {
    // Initial check
    checkConnection();
    // Recurring check every 30s
    pollTimer = setInterval(() => {
      checkConnection();
    }, CHECK_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  // Auto-start polling on creation
  if (typeof window !== 'undefined') {
    startPolling();
  }

  return {
    get apiToken(): string {
      return apiToken;
    },
    set apiToken(value: string) {
      apiToken = value;
    },

    get strapiStatus(): StrapiStatus {
      return strapiStatus;
    },

    checkConnection,
    getAuthHeaders,
    startPolling,
    stopPolling,
  };
}

export const connectionStore = createConnectionStore();
