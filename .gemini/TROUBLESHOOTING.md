# LaunchPad CMS — Troubleshooting Guide

> Tài liệu xử lý sự cố cho AI Agent. Khi gặp lỗi, tham khảo file này TRƯỚC KHI tự suy luận giải pháp.

---

## 1. Next.js Issues

### 1.1 Hydration Mismatch

**Triệu chứng:** `Warning: Text content did not match. Server: "..." Client: "..."`

**Nguyên nhân:** Sử dụng `Math.random()`, `Date.now()`, hoặc `useId()` không đúng cách trong SSR.

**Giải pháp:**
- Dùng deterministic IDs (index-based hoặc data-based).
- Wrap random content trong `useEffect` (chỉ chạy client-side).
- Thêm `suppressHydrationWarning` nếu cần (đã dùng ở root layout).

### 1.2 Three.js / Globe NaN Error

**Triệu chứng:** `NaN` values trong Three.js rendering, canvas trắng.

**Nguyên nhân:** Globe data hoặc arc positions chứa NaN sau transformation.

**Giải pháp:** File `components/ui/globe.tsx` đã có NaN validation. Khi tạo 3D components mới:
```typescript
// Luôn validate số trước khi pass vào Three.js
if (isNaN(value)) return fallbackValue;
```

### 1.3 Strapi API Fetch Fails (Server Component)

**Triệu chứng:** `ECONNREFUSED` hoặc `fetch failed` trong Server Components.

**Nguyên nhân:** URL sai context (SSR vs Client).

**Giải pháp:**
- **Dev mode:** Strapi phải đang chạy trên `localhost:1337`.
- **Docker:** Sử dụng `STRAPI_INTERNAL_URL=http://strapi:1337` (Docker DNS).
- **Client:** Sử dụng `NEXT_PUBLIC_API_URL=http://localhost:1337`.
- Logic tự động trong `lib/utils.ts` → `API_URL`:
  ```
  Server-side → STRAPI_INTERNAL_URL (Docker internal)
  Client-side → NEXT_PUBLIC_STRAPI_URL || NEXT_PUBLIC_API_URL
  ```

### 1.4 Dynamic Zone Not Rendering

**Triệu chứng:** Page trống, không có DZ content.

**Nguyên nhân:** Missing populate middleware hoặc chưa đăng ký component.

**Checklist:**
1. Content type schema có `dynamic_zone` attribute?
2. Populate middleware có `on: { 'dynamic-zone.{name}': { populate: ... } }`?
3. Middleware đã đăng ký trong routes config?
4. `manager.tsx` có mapping cho `__component` string?

### 1.5 Images Not Loading

**Triệu chứng:** Broken images, 404 errors.

**Nguyên nhân:** Strapi image URLs relative vs absolute.

**Giải pháp:**
- Luôn dùng `StrapiImage` component hoặc `strapiImage()` helper.
- Check `next.config.mjs` → `images.remotePatterns` có domain mới không.
- Check rewrites: `/uploads/*` → Strapi backend.

### 1.6 Cache Stale Data

**Triệu chứng:** Content đã sửa trên Strapi nhưng frontend không cập nhật.

**Giải pháp:**
- Strapi Webhook → Next.js `revalidateContent()` → `revalidateTag()`.
- Dev mode: `cacheLife` tự bypass.
- Force revalidate: Restart Next.js hoặc clear `.next/cache`.

---

## 2. Strapi Issues

### 2.1 Content Type Not Found

**Triệu chứng:** `404` khi gọi API endpoint.

**Checklist:**
1. Schema JSON valid? (`src/api/{name}/content-types/{name}/schema.json`)
2. Controller, service, routes files exist?
3. `yarn strapi build` đã chạy sau khi thêm content type?
4. API permissions đã set trong Admin → Settings → Users & Permissions?

### 2.2 Nested Data Returns `null`

**Triệu chứng:** Relations/components trả về `null` thay vì populated data.

**Nguyên nhân:** Strapi 5 mặc định KHÔNG populate nested data.

**Giải pháp:** Tạo populate middleware (xem STYLE_GUIDE.md §3.2).

### 2.3 i18n Locale Not Working

**Triệu chứng:** Content chỉ trả về 1 locale.

**Checklist:**
1. Content type schema có `"i18n": { "localized": true }` trong `pluginOptions`?
2. Từng field có `"i18n": { "localized": true }` không?
3. API request có `?locale=fr` parameter?
4. Content đã được tạo cho locale đó trong Admin panel?

### 2.4 Database Migration Error

**Triệu chứng:** Strapi crash khi start sau khi sửa schema.

**Giải pháp:**
- Dev: Xóa DB và re-seed: `docker compose down -v && docker compose up -d launchpad-db`
- Prod: Check `strapi/database/migrations/` — thêm migration file nếu cần.

---

## 3. Docker Issues

### 3.1 Port Conflict

**Triệu chứng:** `bind: address already in use`

**Giải pháp:**
```bash
# Windows
npx kill-port 3000 1337 54321

# Hoặc dùng VSCode task
# "🧹 cms: clean"
```

### 3.2 Database Connection Refused

**Triệu chứng:** Strapi: `ECONNREFUSED` to PostgreSQL.

**Checklist:**
1. DB container running? `docker compose ps`
2. Health check passing? `docker compose logs launchpad-db`
3. `.env` credentials match giữa Strapi và DB?
4. **Docker internal:** `DATABASE_HOST=launchpad-db` (NOT localhost).
5. **Docker internal:** `DATABASE_PORT=5432` (NOT 54321).

### 3.3 Build Fails (Out of Memory)

**Triệu chứng:** `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed`

**Giải pháp:**
- Dockerfile đã set `NODE_OPTIONS=--max-old-space-size=4096`.
- VPS: Cần ít nhất 2GB RAM hoặc thêm swap.
- Hoặc build local, push image → prod pull only (Zero-Build).

---

## 4. Seed Studio Issues

### 4.1 Seeder Fails Mid-Run

**Triệu chứng:** Script crash ở Phase 1/2/3.

**Checklist:**
1. Strapi running và API accessible?
2. `STRAPI_ADMIN_TOKEN` valid trong `.env`?
3. CSV format đúng? (headers phải match exact).
4. Image URLs accessible? (Unsplash có thể bị rate-limit).

**Recovery:**
```bash
# Clean toàn bộ rồi re-seed
node seed-from-csv.mjs --clean
```

### 4.2 Duplicate Data After Re-seed

**Nguyên nhân:** Seeder đã có idempotency check (by slug/name/question).

**Nhưng nếu vẫn duplicate:**
```bash
# Wipe sạch trước khi seed lại
node seed-from-csv.mjs --clean-only
node seed-from-csv.mjs
```

---

## 5. Development Workflow Issues

### 5.1 Strapi phải khởi động trước Next.js

**Pattern:** `yarn dev` đã handle bằng `wait-on http://127.0.0.1:1337`.

Nếu chạy riêng:
```bash
# Terminal 1
yarn strapi

# Terminal 2 (chờ Strapi ready)
yarn next
```

### 5.2 Lock File Conflict

**Triệu chứng:** `.next/dev/lock` prevents start.

**Giải pháp:**
```bash
yarn fix:lock
# Hoặc
npx rimraf next/.next/dev/lock
```

### 5.3 Prettier / Lint-staged Fails

**Triệu chứng:** Commit bị rejected bởi Husky.

**Giải pháp:**
```bash
# Format all files
yarn fix:format

# Sau đó commit lại
git add .
git commit -m "message"
```
