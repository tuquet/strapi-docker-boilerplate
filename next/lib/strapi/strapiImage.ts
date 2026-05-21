import { unstable_noStore as noStore } from 'next/cache';

import { API_URL } from '../utils';

export function strapiImage(url: string): string {
  noStore();

  // Relative paths starting with /uploads/ — pass through as-is
  // The Next.js rewrite rule proxies /uploads/* → strapi:1337 internally
  if (url.startsWith('/uploads/')) return url;

  // For absolute Strapi URLs, extract just the /uploads/... path
  if (url.startsWith('http') || url.startsWith('//')) {
    const uploadsIndex = url.indexOf('/uploads/');
    if (uploadsIndex !== -1) {
      return url.substring(uploadsIndex);
    }
    return url;
  }

  if (url.startsWith('/')) {
    return API_URL + url;
  }

  return url;
}
