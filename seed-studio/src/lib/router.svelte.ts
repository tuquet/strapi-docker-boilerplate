/**
 * Simple hash-based SPA router using Svelte 5 runes.
 * Routes are defined as hash fragments: #/dashboard, #/pipeline, etc.
 */

export type Route =
  | 'dashboard'
  | 'content-explorer'
  | 'article-editor'
  | 'seed-data'
  | 'pipeline'
  | 'backup'
  | 'media'
  | 'settings';

const VALID_ROUTES: Set<string> = new Set<Route>([
  'dashboard',
  'content-explorer',
  'article-editor',
  'seed-data',
  'pipeline',
  'backup',
  'media',
  'settings',
]);

const DEFAULT_ROUTE: Route = 'dashboard';

function parseHash(hash: string): Route {
  // Strip leading #/ or # 
  const cleaned = hash.replace(/^#\/?/, '').toLowerCase();
  if (cleaned && VALID_ROUTES.has(cleaned)) {
    return cleaned as Route;
  }
  return DEFAULT_ROUTE;
}

function createRouter() {
  let route = $state<Route>(parseHash(window.location.hash));

  function handleHashChange() {
    route = parseHash(window.location.hash);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('hashchange', handleHashChange);
  }

  return {
    get currentRoute(): Route {
      return route;
    },

    navigate(path: Route) {
      window.location.hash = `#/${path}`;
      // Route will update via hashchange listener
    },

    /** Clean up the event listener (call in onDestroy if needed) */
    destroy() {
      if (typeof window !== 'undefined') {
        window.removeEventListener('hashchange', handleHashChange);
      }
    },
  };
}

export const router = createRouter();
