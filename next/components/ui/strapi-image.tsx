import { unstable_noStore as noStore } from 'next/cache';
import Image from 'next/image';
import { ComponentProps } from 'react';

import { API_URL } from '@/lib/utils';

interface StrapiImageProps
  extends Omit<ComponentProps<typeof Image>, 'src' | 'alt'> {
  src: string;
  alt: string | null;
}

export function getStrapiMedia(url: string | null) {
  if (url == null) return null;
  if (url.startsWith('data:')) return url;

  // For absolute Strapi URLs (e.g. http://localhost:1337/uploads/...),
  // extract just the /uploads/... path. The Next.js rewrite rule
  // proxies /uploads/* → strapi:1337 internally, avoiding hostname issues.
  if (url.startsWith('http') || url.startsWith('//')) {
    const uploadsIndex = url.indexOf('/uploads/');
    if (uploadsIndex !== -1) {
      return url.substring(uploadsIndex);
    }
    return url;
  }

  // Relative paths starting with /uploads/ — pass through as-is
  if (url.startsWith('/uploads/')) return url;

  return API_URL + url;
}

export function StrapiImage({
  src,
  alt,
  className,
  ...rest
}: Readonly<StrapiImageProps>) {
  noStore();
  const imageUrl = getStrapiMedia(src);
  if (!imageUrl) return null;
  return (
    <Image
      src={imageUrl}
      alt={alt ?? 'No alternative text provided'}
      className={className}
      {...rest}
    />
  );
}
