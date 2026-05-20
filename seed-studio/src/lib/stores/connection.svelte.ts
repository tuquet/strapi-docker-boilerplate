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

  /** Persist token to localStorage */
  function saveToken(value: string) {
    try {
      if (value) {
        localStorage.setItem(STORAGE_KEY, value);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage may be unavailable
    }
  }

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
    checkConnection();
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
      saveToken(value);
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
