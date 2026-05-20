# LaunchPad CMS Fullstack — AI Agent Skills

> **Tài liệu kỹ thuật nội bộ dành cho AI Agent.** Đọc file này TRƯỚC KHI thực hiện bất kỳ thay đổi nào trong dự án.

---

## 1. Tổng quan Dự án

**LaunchPad CMS Fullstack** là nền tảng Headless CMS chuẩn B2B SaaS Enterprise, kết hợp:

| Layer           | Tech                 | Version | Thư mục        | Port   |
| --------------- | -------------------- | ------- | -------------- | ------ |
| **Frontend**    | Next.js (App Router) | ^16.0.0 | `next/`        | 3000   |
| **Backend**     | Strapi 5             | 5.46.0  | `strapi/`      | 1337   |
| **Database**    | PostgreSQL           | 16      | Docker         | 54321  |
| **Seed Studio** | Svelte 5 + Hono      | —       | `seed-studio/` | 4000   |
| **Docs**        | VitePress            | 1.6.4   | `docs/`        | —      |
| **Proxy**       | Nginx                | alpine  | `nginx/`       | 80/443 |

**Package Manager:** Yarn 4 (Corepack) — KHÔNG sử dụng npm/pnpm.

> ⚠️ **KHÔNG phải Monorepo.** Mỗi thư mục (`next/`, `strapi/`, `seed-studio/`, `docs/`) là **independent package** với `node_modules` và `yarn.lock` riêng biệt. Strapi KHÔNG tương thích với hoisted/shared `node_modules`. Khi cài thêm dependency, phải `cd` vào đúng thư mục rồi `yarn add`.

---

## 2. Cấu trúc Dự án (Independent Packages)

```
launchpad-cms-fullstack/
├── next/                  # Next.js 16 Frontend (App Router, RSC)
│   ├── app/               # Route handlers & pages
│   │   ├── [locale]/      # i18n: en, vi
│   │   │   ├── (marketing)/   # Route group: homepage, slug pages
│   │   │   ├── blog/          # Blog listing & detail
│   │   │   ├── products/      # Product listing & detail
│   │   │   └── sign-up/       # Registration
│   │   └── api/           # API routes (preview, exit-preview)
│   ├── components/        # React components (UI, dynamic-zone, products, navbar)
│   ├── lib/               # Utils, Strapi client, metadata helpers
│   ├── context/           # React Context (Cart, Slug)
│   └── types/             # TypeScript type definitions
├── strapi/                # Strapi 5 Backend (Headless CMS)
│   ├── src/api/           # 12 Content Types (9 collection + 3 single)
│   ├── src/components/    # 32 Strapi Components (DZ, shared, cards, items, global)
│   ├── config/            # Server, DB, plugins, middleware, admin config
│   └── scripts/           # Docker entrypoint, UUID gen, login prefill
├── seed-studio/           # Svelte 5 GUI for content seeding
│   ├── src/               # Svelte frontend
│   ├── server.ts          # Hono TypeScript HTTP server (7 API endpoints)
│   └── seed-from-csv.mjs  # Core seeder script (4-phase pipeline)
├── docs/                  # VitePress documentation site
├── nginx/                 # Nginx reverse proxy config
├── scripts/               # DevOps scripts (install, copy-env, cleanup, reset, toggle-seed)
├── compose.yml            # Docker Compose (dev — build from source)
└── compose.prod.yml       # Docker Compose (prod — pull from registry)
```

---

## 3. Quy ước & Coding Standards

### 3.1 Formatting (Prettier)

```json
{
  "endOfLine": "lf",
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "arrowParens": "always",
  "plugins": ["@trivago/prettier-plugin-sort-imports"]
}
```

- **Import ordering:** Sử dụng `@trivago/prettier-plugin-sort-imports` — imports tự động sắp xếp.
- **Husky pre-commit:** Chạy `lint-staged` → `prettier --write` + `next lint --fix` trước mỗi commit.

### 3.2 ESLint (Next.js)

- Config: `next/core-web-vitals` (file `next/.eslintrc.json`)
- Chỉ lint files trong `next/` directory.

### 3.3 TypeScript

- **Strict mode** bật trong cả `next/tsconfig.json` và `strapi/tsconfig.json`.
- KHÔNG sử dụng `any` — luôn định nghĩa Interface/Type.
- Strapi auto-generate types tại `strapi/types/generated/`.

### 3.4 Component Conventions (Next.js)

| Quy tắc                        | Mô tả                                                                      |
| ------------------------------ | -------------------------------------------------------------------------- |
| **Server Components mặc định** | Chỉ thêm `'use client'` khi cần interactivity (animations, state, effects) |
| **Next.js 16 `'use cache'`**   | Sử dụng `cacheLife('minutes')` + `cacheTag()` cho Strapi data fetching     |
| **Dynamic imports**            | Dynamic Zone components dùng `next/dynamic` để code-split                  |
| **Naming**                     | PascalCase cho components, camelCase cho utils/hooks, kebab-case cho files |
| **`cn()` helper**              | Dùng `cn()` từ `lib/utils.ts` (clsx + tailwind-merge) cho class merging    |

### 3.5 Styling (Tailwind CSS 3)

- Config tại `next/tailwind.config.ts`
- Custom colors: `charcoal (#08090A)`, `lightblack (#1C1C1C)`, `secondary (#E6E6E6)`, `muted (CSS var)`
- Custom animations: `move`, `spin-circle`
- Plugins: `tailwindcss-animate`, `@tailwindcss/typography`, custom `addVariablesForColors`
- **Dark-first design** — UI mặc định là dark theme.

---

## 4. Strapi Content Architecture

### 4.1 Content Types (12 total)

**Collection Types (9):**

| Content Type  | i18n | Draft | Key Relations                         | Custom Middleware  |
| ------------- | ---- | ----- | ------------------------------------- | ------------------ |
| `Article`     | ✅   | ✅    | categories (M2M), image               | `article-populate` |
| `Category`    | ✅   | ❌    | product (M2O), articles (M2M)         | —                  |
| `FAQ`         | ✅   | ❌    | —                                     | —                  |
| `Logo`        | ❌   | ❌    | image (required)                      | —                  |
| `Page`        | ✅   | ✅    | dynamic_zone (10 DZ types)            | `page-populate`    |
| `Plan`        | ✅   | ✅    | product (M2O), perks, CTA             | —                  |
| `Product`     | ✅   | ✅    | plans (O2M), categories (O2M), images | `product-populate` |
| `Redirection` | ❌   | ✅    | source → destination                  | —                  |
| `Testimonial` | ✅   | ✅    | user component                        | —                  |

**Single Types (3):**

| Single Type                | i18n | Key Components                                        | Custom Middleware       |
| -------------------------- | ---- | ----------------------------------------------------- | ----------------------- |
| `Global`                   | ✅   | navbar, footer, seo                                   | `global-populate`       |
| `Blog Page` (/blog)        | ✅   | seo, heading, dynamic_zone                            | `blog-page-populate`    |
| `Product Page` (/products) | ✅   | seo, heading, featured/popular sections, dynamic_zone | `product-page-populate` |

### 4.2 Entity Relationships

```
Product (1) ──→ (N) Plan
Product (1) ──→ (N) Category
Category (N) ←──→ (N) Article

Dynamic Zone relations:
  Testimonials DZ → Testimonial collection
  Brands DZ       → Logo collection
  Pricing DZ      → Plan collection
  FAQ DZ          → FAQ collection
  Related Articles DZ  → Article collection
  Related Products DZ  → Product collection

Global:
  Navbar → Logo (1:1)
  Footer → Logo (1:1)
```

### 4.3 Components (32 total)

| Namespace        | Count | Components                                                                                                                                |
| ---------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `dynamic-zone.*` | 12    | hero, features, cta, testimonials, how-it-works, brands, pricing, launches, faq, form-next-to-section, related-articles, related-products |
| `shared.*`       | 10    | seo, button, link, perks, user, steps, form, section, launches, social-media-icon-links                                                   |
| `cards.*`        | 4     | globe-card, ray-card, graph-card, social-media-card                                                                                       |
| `items.*`        | 4     | input, ray-items, graph-card-top-items, left-navbar-items                                                                                 |
| `global.*`       | 2     | navbar, footer                                                                                                                            |

### 4.4 Populate Middleware Pattern

**Pattern kiến trúc quan trọng nhất của Strapi layer.** Tất cả 6 custom middlewares override `ctx.query.populate` để deep populate nested relations/components. Client KHÔNG cần truyền `populate` params phức tạp.

Khi tạo content type mới có nested relations: **BẮT BUỘC tạo populate middleware tương ứng.**

```
strapi/src/api/{content-type}/middlewares/{content-type}-populate.ts
```

---

## 5. Next.js Frontend Architecture

### 5.1 Data Fetching Layer

File quan trọng nhất: `next/lib/strapi/client.ts`

```typescript
// Pattern: Server-side fetch với Next.js 16 caching
fetchCollectionType<T>(contentType, config?)  // → 'use cache' + cacheTag
fetchSingleType<T>(contentType, config?)      // → 'use cache' + cacheTag
fetchDocument<T>(contentType, documentId)     // → Single document
revalidateContent(contentType)                // → Webhook revalidation
```

- **SSR URL:** `STRAPI_INTERNAL_URL` (http://strapi:1337) cho Docker network.
- **Client URL:** `NEXT_PUBLIC_API_URL` cho browser requests.
- **Draft Mode:** Tự động bypass cache khi `draftMode()` enabled.

### 5.2 Dynamic Zone System

File: `next/components/dynamic-zone/manager.tsx` (`'use client'`)

Mapping `__component` string → React component via `next/dynamic`:

| Strapi `__component`                | React Component     |
| ----------------------------------- | ------------------- |
| `dynamic-zone.hero`                 | `Hero`              |
| `dynamic-zone.features`             | `Features`          |
| `dynamic-zone.testimonials`         | `Testimonials`      |
| `dynamic-zone.how-it-works`         | `HowItWorks`        |
| `dynamic-zone.brands`               | `Brands`            |
| `dynamic-zone.pricing`              | `Pricing`           |
| `dynamic-zone.launches`             | `Launches`          |
| `dynamic-zone.cta`                  | `CTA`               |
| `dynamic-zone.form-next-to-section` | `FormNextToSection` |
| `dynamic-zone.faq`                  | `FAQ`               |
| `dynamic-zone.related-products`     | `RelatedProducts`   |
| `dynamic-zone.related-articles`     | `RelatedArticles`   |

Khi thêm Dynamic Zone mới: phải update CÙNG LÚC cả 3 nơi:

1. **Strapi:** Component schema + thêm vào `pluginOptions.dynamic-zone` trong page/blog-page/product-page
2. **Strapi Middleware:** Thêm populate rule trong các `*-populate.ts`
3. **Next.js:** Tạo React component + đăng ký trong `manager.tsx`

### 5.3 i18n System

- **Locales:** `en`, `vi` (config tại `next/i18n.config.ts`)
- **Route pattern:** `/[locale]/...` — all pages wrapped by locale segment
- **SlugContext:** Client context tracking localized slugs cho `LocaleSwitcher`
- **Strapi i18n:** Hầu hết content types đều bật i18n — data trả về kèm `localizations[]`

### 5.4 Preview System (Strapi ↔ Next.js)

```
Strapi Admin → "Preview" button
  → GET /api/preview?url=/{locale}{path}&secret={PREVIEW_SECRET}&status={status}
  → Next.js enables draftMode()
  → fetchCollectionType() bypasses cache, queries status: 'draft'
  → Preview component listens postMessage for live updates
```

URL mapping (config tại `strapi/config/admin.ts`):

```
page (slug=homepage) → /
page (other)         → /{slug}
product              → /products/{slug}
article              → /blog/{slug}
product-page         → /products
blog-page            → /blog
```

### 5.5 Key Libraries

| Library                         | Purpose                 | Usage                              |
| ------------------------------- | ----------------------- | ---------------------------------- |
| `framer-motion` v12             | Animations, transitions | Navbar, cards, modals, decorations |
| `three` + `@react-three/fiber`  | 3D Globe                | Features section globe card        |
| `@strapi/client`                | Official Strapi SDK     | Data fetching                      |
| `@strapi/blocks-react-renderer` | Rich text rendering     | Article content                    |
| `react-fast-marquee`            | Auto-scrolling          | Testimonials                       |
| `next-view-transitions`         | View Transitions API    | Root layout                        |
| `fuzzy-search`                  | Fuzzy text search       | Blog post filtering                |
| `class-variance-authority`      | Component variants      | Button styles                      |

---

## 6. Seed Studio (Content Seeding)

### 6.1 Architecture

Svelte 5 frontend (port 5173 dev / 4000 prod) + **Hono** TypeScript HTTP server (port 4000).

**Server Stack:** Hono + `@hono/node-server` + `streamSSE` + `serveStatic` + `dotenv`.

### 6.2 Seeder Pipeline (4 phases)

```
Phase 0: Logos (CSV)         → POST /api/logos
Phase 1: Collection Types    → Categories → Products → Plans → FAQs → Testimonials → Articles
Phase 2: Single Types (JSON) → PUT /api/global, /api/blog-page, /api/product-page
Phase 3: Pages + DZ (JSON)   → POST /api/pages (with relation injection)
```

### 6.3 Seed Data Location

```
seed-studio/seed-data/
├── 00_logos.csv          # 1 logo
├── 01_categories.csv     # 5 categories (EN)
├── 02_products.csv       # 3 products with Unsplash images
├── 03_plans.csv          # 5 pricing plans
├── 04_faqs.csv           # 8 FAQs (4 VI + 4 EN)
├── 05_testimonials.csv   # 6 testimonials (3 VI + 3 EN)
├── 06_articles.csv       # 6 articles (3 VI + 3 EN)
├── blocks/articles.json  # Rich text content per article slug
├── pages/*.json          # Page layouts with DZ blocks
└── single-types/*.json   # Global, blog-page, product-page
```

### 6.4 CLI Flags

```bash
node seed-from-csv.mjs              # Seed all
node seed-from-csv.mjs --clean      # Clean + re-seed
node seed-from-csv.mjs --clean-only # Wipe DB only
node seed-from-csv.mjs --dry-run    # Preview without API calls
```

### 6.5 Nâng cao: Khôi phục Dữ liệu & On-Demand Seeding

- **Khôi phục Backup (`/api/restore-stream` & `/api/backup-preview`):** Seed Studio tích hợp tính năng đọc nội dung file backup `.tar.gz` của Strapi v5, giúp thống kê dữ liệu bên trong (Articles, Categories, Media, Users) và thực thi luồng `strapi import` ngay trên GUI để làm mới database.
- **Tạo Article Đơn Lẻ (`/api/seed-article`):** Cho phép gọi POST API để tạo nhanh 1 bài viết trong Strapi, sau đó tự động lưu nội dung mới này append vào file `06_articles.csv` để đảm bảo tính nhất quán (persistence).

---

## 7. Infrastructure & DevOps

### 7.1 Docker Network

```
                    ┌─────────────────────────────────────┐
                    │         Docker Network               │
  Browser ──80/443──┤                                     │
                    │  nginx ──→ nextjs:3000 (Frontend)   │
                    │        ──→ strapi:1337 (Backend)    │
                    │                                     │
                    │  nextjs ──→ strapi:1337 (Internal)  │
                    │  strapi ──→ launchpad-db:5432 (DB)  │
                    └─────────────────────────────────────┘
```

### 7.2 Dev vs Prod

| Aspect     | Dev (`compose.yml`)        | Prod (`compose.prod.yml`)                 |
| ---------- | -------------------------- | ----------------------------------------- |
| Build      | Build from source          | Pull from registry                        |
| DB Port    | 54321:5432                 | 54321:5432                                |
| Nginx Port | 80, 443                    | 8000→80, 8443→443                         |
| Strapi     | Volume mounts (hot reload) | Immutable image                           |
| Next.js    | —                          | `NEXT_PUBLIC_API_URL: http://strapi:1337` |

### 7.3 Scripts

| Script                   | Command                                      | Purpose                             |
| ------------------------ | -------------------------------------------- | ----------------------------------- |
| `scripts/install.sh`     | `bash scripts/install.sh`                    | One-click demo setup                |
| `scripts/copy-env.sh`    | `bash scripts/copy-env.sh --env dev`         | Generate `.env` with random secrets |
| `scripts/cleanup.sh`     | `bash scripts/cleanup.sh`                    | Docker prune + system cleanup       |
| `scripts/reset.sh`       | `bash scripts/reset.sh`                      | Reset repo (down + remove envs)     |
| `scripts/toggle-seed.sh` | `bash scripts/toggle-seed.sh enable/disable` | Toggle seed flag in envs            |

### 7.4 VSCode Tasks

Dự án có 20 VSCode tasks predefined cho development workflow — xem `.vscode/tasks.json`.
Các task chính: `🚀 cms: dev`, `🐳 docker: build-all`, `🐳 registry: push-all`.

---

## 8. Quy trình Phát triển

### 8.1 Local Development

```bash
# 1. Khởi động Database
docker compose up -d launchpad-db launchpad-adminer

# 2. Cài đặt dependencies
yarn setup

# 3. Dev server (Strapi + Next.js song song)
yarn dev

# 4. (Optional) Seed data
yarn setup:seed

# 5. (Optional) Seed Studio UI
yarn seed:ui
```

### 8.2 Thêm Content Type Mới

**Checklist bắt buộc khi thêm Content Type:**

1. `strapi/src/api/{name}/content-types/{name}/schema.json` — Define schema
2. `strapi/src/api/{name}/controllers/{name}.ts` — Controller (default factory OK)
3. `strapi/src/api/{name}/services/{name}.ts` — Service (default factory OK)
4. `strapi/src/api/{name}/routes/{name}.ts` — Routes (default factory OK)
5. `strapi/src/api/{name}/middlewares/{name}-populate.ts` — **Deep populate middleware** (nếu có nested relations)
6. `next/types/types.ts` — Thêm TypeScript interface
7. `next/components/` — Tạo React component tương ứng
8. `next/app/[locale]/` — Tạo route page nếu cần
9. `seed-studio/seed-data/` — Thêm seed data file

### 8.3 Thêm Dynamic Zone Component Mới

1. **Strapi Component:** `strapi/src/components/dynamic-zone/{name}.json`
2. **Strapi Content Type:** Thêm component vào `pluginOptions` của page/blog-page/product-page
3. **Strapi Middleware:** Update tất cả `*-populate.ts` middlewares
4. **Next.js Component:** `next/components/dynamic-zone/{name}.tsx`
5. **Next.js Manager:** Đăng ký trong `next/components/dynamic-zone/manager.tsx`
6. **Seed Data (optional):** Update JSON pages trong `seed-studio/seed-data/pages/`

### 8.4 Production Deployment

```bash
# Local: Build & push images
docker build -t registry.example.com/strapi-app:v1 ./strapi
docker build -t registry.example.com/next-app:v1 ./next
docker push registry.example.com/strapi-app:v1
docker push registry.example.com/next-app:v1

# VPS: Pull & run
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
```

---

## 9. Lưu ý Quan trọng cho Agent

### ⚠️ KHÔNG được làm

- **KHÔNG sửa** `strapi/types/generated/` — file auto-generated bởi Strapi.
- **KHÔNG dùng** `npm` hoặc `pnpm` — chỉ dùng `yarn`.
- **KHÔNG tạo** `middleware.ts` ở root `next/` — i18n logic nằm trong `proxy.ts`.
- **KHÔNG hardcode** Strapi URL — luôn dùng `API_URL` từ `lib/utils.ts`.
- **KHÔNG bỏ** `noStore()` trong image helpers — cần thiết cho cache invalidation.
- **KHÔNG import** trực tiếp `three` trong Server Components — chỉ dùng trong `'use client'` files.

### ✅ PHẢI tuân thủ

- Mọi component mới: server component by default, chỉ thêm `'use client'` khi cần.
- Mọi data fetch: qua `fetchCollectionType()` / `fetchSingleType()` — KHÔNG fetch trực tiếp.
- Mọi image: qua `StrapiImage` component hoặc `strapiImage()` helper.
- Mọi class: qua `cn()` helper — KHÔNG nối string thủ công.
- Mọi content type mới với nested data: tạo populate middleware.
- Mọi page: phải có `loading.tsx` skeleton.
- Mọi dependency mới: `cd` vào đúng thư mục (`next/`, `strapi/`, `seed-studio/`) rồi `yarn add`. KHÔNG install ở root trừ devDependencies dùng chung.
- Format code trước khi commit: `yarn fix:format`.
