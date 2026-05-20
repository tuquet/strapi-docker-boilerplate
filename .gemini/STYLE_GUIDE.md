# LaunchPad CMS — Style Guide

> Tài liệu quy chuẩn code cho AI Agent. Tuân thủ **tuyệt đối** khi viết code mới hoặc chỉnh sửa.

---

## 1. TypeScript Conventions

### 1.1 Type Definitions

```typescript
// ✅ ĐÚNG: Explicit interface cho mọi component props
interface BlogCardProps {
  article: Article;
  variant?: 'horizontal' | 'vertical';
  className?: string;
}

// ❌ SAI: Inline types hoặc any
const BlogCard = (props: any) => { ... }
const BlogCard = ({ article }: { article: any }) => { ... }
```

### 1.2 Strapi Response Types

```typescript
// Types nằm tại: next/types/types.ts và next/types/strapi.ts
// Khi thêm content type mới, BẮT BUỘC thêm interface tại đây.

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  plans: Plan[];
  perks: Perk[];
  dynamic_zone: DynamicZone[];
  featured?: boolean;
  images: Image[];
  categories?: Category[];
  localizations?: Localization[];
}
```

### 1.3 Locale Types

```typescript
// Luôn sử dụng type từ i18n config
import { Locale } from '@/i18n.config';

type LocaleParamsProps = {
  params: Promise<{ locale: Locale }>;
};

type LocaleSlugParamsProps = {
  params: Promise<{ slug: string; locale: Locale }>;
};
```

---

## 2. React / Next.js Patterns

### 2.1 Server Component (Default)

```typescript
// ✅ Server Component — NO 'use client' directive
import { fetchCollectionType } from '@/lib/strapi';

export default async function BlogPage({ params }: LocaleParamsProps) {
  const { locale } = await params;
  const articles = await fetchCollectionType('articles', { locale });

  return (
    <Container>
      {articles.map((article) => (
        <BlogCard key={article.id} article={article} />
      ))}
    </Container>
  );
}
```

### 2.2 Client Component (Only When Needed)

```typescript
'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AccordionProps {
  items: FAQ[];
  className?: string;
}

export function Accordion({ items, className }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={false}
          animate={{ height: openIndex === index ? 'auto' : 0 }}
        >
          {/* ... */}
        </motion.div>
      ))}
    </div>
  );
}
```

### 2.3 Data Fetching Pattern

```typescript
// ✅ ĐÚNG: Sử dụng Strapi client helpers
import { fetchCollectionType, fetchSingleType } from '@/lib/strapi';

// Collection type
const articles = await fetchCollectionType<Article>('articles', {
  locale,
  sort: ['publishedAt:desc'],
});

// Single type
const global = await fetchSingleType<Global>('global', { locale });

// ❌ SAI: Fetch trực tiếp
const res = await fetch('http://localhost:1337/api/articles');
```

### 2.4 Loading States

```typescript
// Mọi dynamic route PHẢI có loading.tsx
// Pattern chuẩn: skeleton UI với animate-pulse

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20">
      <div className="mb-8 h-10 w-2/3 animate-pulse rounded-lg bg-gray-700" />
      <div className="mb-4 h-6 w-1/2 animate-pulse rounded bg-gray-700" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-700" />
        ))}
      </div>
    </div>
  );
}
```

### 2.5 Image Handling

```typescript
// ✅ Sử dụng StrapiImage component
import { StrapiImage } from '@/components/ui/strapi-image';

<StrapiImage
  src={article.image.url}
  alt={article.image.alternativeText || article.title}
  width={800}
  height={400}
  className="rounded-xl object-cover"
/>

// ✅ Hoặc dùng helper function
import { strapiImage } from '@/lib/strapi/strapiImage';

const imageUrl = strapiImage(article.image.url);
```

---

## 3. Strapi Backend Patterns

### 3.1 Content Type Schema

```json
{
  "kind": "collectionType",
  "collectionName": "examples",
  "info": {
    "singularName": "example",
    "pluralName": "examples",
    "displayName": "Example"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {
    "i18n": {
      "localized": true
    }
  },
  "attributes": {
    "title": {
      "type": "string",
      "pluginOptions": {
        "i18n": { "localized": true }
      }
    },
    "slug": {
      "type": "uid",
      "targetField": "title"
    },
    "seo": {
      "type": "component",
      "repeatable": false,
      "component": "shared.seo"
    }
  }
}
```

### 3.2 Populate Middleware Pattern

```typescript
// strapi/src/api/{name}/middlewares/{name}-populate.ts
// Pattern BẮT BUỘC cho content types có nested relations

const populate = {
  seo: { populate: { metaImage: { fields: ['url', 'alternativeText'] } } },
  image: { fields: ['url', 'alternativeText'] },
  categories: { populate: { articles: true } },
  dynamic_zone: {
    on: {
      'dynamic-zone.hero': { populate: { CTAs: true } },
      'dynamic-zone.pricing': {
        populate: {
          plans: {
            populate: {
              perks: true,
              CTA: true,
              localizations: true,
            },
          },
        },
      },
      // ... thêm các DZ components khác
    },
  },
};

export default (config, { strapi }) => {
  return async (ctx, next) => {
    ctx.query = {
      ...ctx.query,
      populate,
    };
    await next();
  };
};
```

### 3.3 Controller & Service (Default Factory)

```typescript
// Hầu hết content types dùng default factory — KHÔNG custom logic
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::example.example');
export default factories.createCoreService('api::example.example');
export default factories.createCoreRouter('api::example.example');
```

### 3.4 Route Registration (with middleware)

```typescript
// Đăng ký middleware cho routes cụ thể
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::page.page', {
  config: {
    find: { middlewares: ['api::page.page-populate'] },
    findOne: { middlewares: ['api::page.page-populate'] },
  },
});
```

---

## 4. CSS / Tailwind Patterns

### 4.1 Class Merging

```typescript
// LUÔN dùng cn() helper
import { cn } from '@/lib/utils';

<div className={cn(
  'rounded-xl border border-neutral-800 bg-charcoal p-6',
  'transition-all duration-300 hover:border-neutral-700',
  isActive && 'border-cyan-500 shadow-aceternity',
  className
)} />
```

### 4.2 Custom Colors (from tailwind.config.ts)

```css
/* Project palette */
charcoal:   #08090A   /* Primary background */
lightblack: #1C1C1C   /* Card background */
secondary:  #E6E6E6   /* Light text */
muted:      var(--muted) /* Muted text */
```

### 4.3 Animation Patterns

```typescript
// Framer Motion cho complex animations
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: 'easeOut' }}
/>

// Tailwind cho simple animations
<div className="animate-pulse" />
<div className="transition-all duration-300 hover:scale-105" />
```

---

## 5. File Naming Conventions

| Entity | Convention | Example |
| --- | --- | --- |
| React Components | `kebab-case.tsx` | `blog-card.tsx`, `hero.tsx` |
| Pages | `page.tsx` (App Router) | `app/[locale]/blog/page.tsx` |
| Loading states | `loading.tsx` | `app/[locale]/blog/loading.tsx` |
| Layouts | `layout.tsx` | `app/[locale]/layout.tsx` |
| Utils/Libs | `camelCase.ts` | `strapiImage.ts`, `next-metadata.ts` |
| Types | `types.ts` or `{name}.d.ts` | `types/types.ts`, `three-fiber.d.ts` |
| Strapi Components | `kebab-case.json` | `shared/seo.json`, `dynamic-zone/hero.json` |
| Strapi Middlewares | `{content-type}-populate.ts` | `page-populate.ts` |
| Seed Data | `{order}_{name}.csv` | `01_categories.csv` |
| Shell Scripts | `kebab-case.sh` | `copy-env.sh` |

---

## 6. Import Order (Auto-sorted by Prettier)

```typescript
// 1. External packages
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

// 2. Internal aliases (@/)
import { cn } from '@/lib/utils';
import { fetchCollectionType } from '@/lib/strapi';
import { Container } from '@/components/container';
import { Heading } from '@/components/elements/heading';

// 3. Relative imports
import { BlogCard } from './blog-card';
import type { Article } from './types';
```

---

## 7. SEO Component Pattern

```typescript
// Mọi page cần SEO phải dùng shared.seo component trong Strapi
// và generateMetadataObject() trong Next.js

import { generateMetadataObject } from '@/lib/shared/metadata';

export async function generateMetadata({ params }: LocaleParamsProps) {
  const { locale } = await params;
  const data = await fetchSingleType('blog-page', { locale });
  return generateMetadataObject(data.seo);
}
```
