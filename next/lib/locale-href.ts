/**
 * Build a localised href for Strapi link data.
 *
 * External URLs (https://, http://) are returned as-is.
 * Internal URLs get the locale prefix prepended.
 */
export function localeHref(url: string, locale: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `/${locale}${url}`;
}

/**
 * Check if a URL is external (absolute http/https).
 */
export function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}
