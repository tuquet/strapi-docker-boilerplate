# LaunchPad CMS — Dependency Graph

> Biểu đồ phụ thuộc giữa các module. Agent sử dụng file này để hiểu impact khi sửa một file cụ thể.

---

## 1. Core Data Flow

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Strapi CMS     │────▶│  Next.js (SSR)   │────▶│   Browser        │
│   (Port 1337)    │     │  (Port 3000)     │     │   (Client)       │
│                  │◀────│                  │     │                  │
│  REST API        │     │  Server Comp.    │     │  Client Comp.    │
│  + Webhooks      │     │  'use cache'     │     │  'use client'    │
└──────────────────┘     └──────────────────┘     └──────────────────┘
        │                        │
        ▼                        ▼
┌──────────────────┐     ┌──────────────────┐
│  PostgreSQL      │     │  Static Assets   │
│  (Port 54321)    │     │  /uploads → API  │
└──────────────────┘     └──────────────────┘
```

---

## 2. File Impact Matrix

Khi sửa file ở cột trái, cần kiểm tra/cập nhật các files ở cột phải.

### Strapi Layer

| File Changed | Files Impacted |
| --- | --- |
| `strapi/src/api/{name}/content-types/{name}/schema.json` | → Populate middleware, Next.js types, Next.js components, Seed data |
| `strapi/src/api/{name}/middlewares/{name}-populate.ts` | → Next.js data fetching (shapes API response) |
| `strapi/src/components/dynamic-zone/{name}.json` | → Page/Blog-Page/Product-Page schemas, Populate middlewares, `manager.tsx`, DZ React component |
| `strapi/src/components/shared/{name}.json` | → Content types using this component, Populate middlewares, Next.js types |
| `strapi/config/admin.ts` | → Preview URL mapping, Next.js `/api/preview` |
| `strapi/config/plugins.ts` | → Swagger docs availability |

### Next.js Layer

| File Changed | Files Impacted |
| --- | --- |
| `next/lib/strapi/client.ts` | → ALL data fetching across ALL pages |
| `next/lib/utils.ts` | → ALL components using `cn()`, `API_URL` |
| `next/components/dynamic-zone/manager.tsx` | → ALL pages with dynamic zones |
| `next/types/types.ts` | → ALL components consuming these types |
| `next/i18n.config.ts` | → Route generation, locale switching, layout |
| `next/next.config.mjs` | → Image domains, rewrites, redirects |
| `next/tailwind.config.ts` | → ALL CSS styling |
| `next/app/[locale]/layout.tsx` | → ALL pages (global layout) |
| `next/context/cart-context.tsx` | → Product page, cart modal |
| `next/app/context/SlugContext.tsx` | → LocaleSwitcher, all pages setting slugs |

### Infrastructure

| File Changed | Files Impacted |
| --- | --- |
| `.env` / `.env.example` | → Docker Compose, Strapi config, Next.js config |
| `compose.yml` | → Dev workflow, port mappings |
| `compose.prod.yml` | → Production deployment |
| `nginx/conf.d/default.conf` | → URL routing, proxy rules |

---

## 3. Component Dependency Tree (Next.js)

```
app/[locale]/layout.tsx
├── components/banner.tsx
├── components/navbar/index.tsx
│   ├── components/navbar/desktop-navbar.tsx
│   │   ├── components/navbar/navbar-item.tsx
│   │   ├── components/logo.tsx
│   │   ├── components/locale-switcher.tsx (→ SlugContext)
│   │   └── components/products/modal.tsx (→ CartContext)
│   └── components/navbar/mobile-navbar.tsx
│       ├── components/navbar/navbar-item.tsx
│       └── components/locale-switcher.tsx
├── components/footer.tsx
│   └── components/logo.tsx
├── components/draft-mode-banner.tsx
└── components/preview.tsx

app/[locale]/(marketing)/page.tsx  (Homepage)
└── lib/shared/PageContent.tsx
    ├── components/decorations/ambient-color.tsx
    └── components/dynamic-zone/manager.tsx
        ├── dynamic-zone/hero.tsx
        │   ├── decorations/star-background.tsx
        │   ├── decorations/shooting-star.tsx
        │   ├── elements/heading.tsx
        │   └── elements/button.tsx
        ├── dynamic-zone/features/index.tsx
        │   ├── features/card.tsx
        │   ├── features/skeletons/first.tsx (→ ui/globe.tsx → THREE.js)
        │   ├── features/skeletons/second.tsx (→ beam/)
        │   ├── features/skeletons/third.tsx
        │   └── features/skeletons/fourth.tsx (→ ui/canvas-reveal-effect.tsx)
        ├── dynamic-zone/testimonials/
        │   └── ui/animated-tooltip.tsx
        ├── dynamic-zone/pricing.tsx
        │   └── elements/button.tsx
        ├── dynamic-zone/how-it-works/
        ├── dynamic-zone/brands.tsx
        ├── dynamic-zone/launches.tsx
        │   └── ui/sticky-scroll.tsx
        ├── dynamic-zone/cta.tsx
        ├── dynamic-zone/faq.tsx
        ├── dynamic-zone/form-next-to-section.tsx
        ├── dynamic-zone/related-products.tsx
        └── dynamic-zone/related-articles.tsx

app/[locale]/blog/page.tsx
├── components/blog-card.tsx
│   ├── ui/strapi-image.tsx
│   └── components/blur-image.tsx
└── components/blog-post-rows.tsx

app/[locale]/products/[slug]/page.tsx
└── components/products/single-product.tsx
    ├── components/blur-image.tsx
    ├── elements/heading.tsx
    └── context/cart-context.tsx → products/modal.tsx
```

---

## 4. Data Fetching Chain

```
Next.js Page (Server Component)
  │
  ├─▶ fetchCollectionType() / fetchSingleType()
  │     │
  │     ├─▶ createClient() → @strapi/client instance
  │     │     └─▶ API_URL (SSR: STRAPI_INTERNAL_URL / Client: NEXT_PUBLIC_API_URL)
  │     │
  │     ├─▶ 'use cache' → cacheLife('minutes') + cacheTag(contentType)
  │     │
  │     └─▶ Strapi REST API
  │           │
  │           ├─▶ Populate Middleware (overrides ctx.query.populate)
  │           │
  │           └─▶ PostgreSQL Database
  │
  ├─▶ Props → React Components (Server → Client boundary)
  │
  └─▶ Webhook Revalidation:
        Strapi → POST webhook → Next.js revalidateContent() → revalidateTag()
```

---

## 5. Environment Variable Dependencies

```
.env (root)
├── DATABASE_CLIENT ──────────▶ strapi/config/database.ts
├── DATABASE_HOST ────────────▶ strapi/config/database.ts (overridden in compose.yml)
├── DATABASE_PORT ────────────▶ strapi/config/database.ts (overridden in compose.yml)
├── DATABASE_NAME ────────────▶ compose.yml → POSTGRES_DB
├── DATABASE_USERNAME ────────▶ compose.yml → POSTGRES_USER
├── DATABASE_PASSWORD ────────▶ compose.yml → POSTGRES_PASSWORD
├── JWT_SECRET ───────────────▶ strapi/config/admin.ts
├── ADMIN_JWT_SECRET ─────────▶ strapi/config/admin.ts
├── APP_KEYS ─────────────────▶ strapi/config/server.ts
├── REGISTRY_URL ─────────────▶ compose.prod.yml (image pull)
├── IMAGE_TAG ────────────────▶ compose.prod.yml (image version)
└── COMPOSE_FILE ─────────────▶ Docker Compose file selection

next/.env.local
├── NEXT_PUBLIC_API_URL ──────▶ lib/utils.ts → API_URL (client)
├── NEXT_PUBLIC_STRAPI_URL ───▶ lib/utils.ts → API_URL (client, fallback)
├── STRAPI_INTERNAL_URL ──────▶ lib/utils.ts → API_URL (SSR in Docker)
├── PREVIEW_SECRET ───────────▶ app/api/preview/route.ts
└── NEXT_OUTPUT ──────────────▶ next.config.mjs → output mode

strapi/.env
├── CLIENT_URL ───────────────▶ config/admin.ts → preview URL base
├── PREVIEW_SECRET ───────────▶ config/admin.ts → preview auth
├── STRAPI_URL ───────────────▶ seed-studio/server.ts
└── STRAPI_ADMIN_TOKEN ───────▶ seed-studio/server.ts (seeder auth)
```
