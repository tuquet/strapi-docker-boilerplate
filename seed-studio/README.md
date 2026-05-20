# 🌱 LaunchPad Seed Studio

**Seed Studio** là công cụ GUI trực quan dùng để nạp dữ liệu mẫu (Content Seeding) vào Strapi CMS.

---

## Tech Stack

| Layer       | Technology                                  |
| ----------- | ------------------------------------------- |
| **Frontend**| Svelte 5 + Vite 8 + Tailwind CSS 4          |
| **Backend** | **Hono** (TypeScript) + `@hono/node-server`  |
| **UI Kit**  | shadcn-svelte (bits-ui)                      |

---

## Tính năng

1. **Data Explorer** — Duyệt, xem trước tất cả seed data (CSV + JSON), thêm dòng CSV nhanh.
2. **Pipeline Visualizer** — Chạy script seed từ UI với SSE log streaming real-time.
3. **Backup Restore** — Khôi phục database từ file backup Strapi (.tar.gz).
4. **On-Demand Article Creator** — Tạo article trực tiếp vào Strapi qua form.

---

## Cấu trúc

```
seed-studio/
├── server.ts           # Hono HTTP server (TypeScript, port 4000)
├── seed-from-csv.mjs   # Core seeder script (4-phase pipeline)
├── seed-data/          # CSV + JSON seed data files
├── src/                # Svelte 5 frontend
│   ├── App.svelte      # Main component
│   ├── lib/
│   │   ├── api.ts      # API client functions
│   │   ├── utils.ts    # cn() helper
│   │   └── components/ # shadcn-svelte UI components
│   └── app.css         # Theme (dark mode, oklch)
├── dist/               # Built Svelte app (served by Hono)
└── package.json
```

---

## Khởi chạy

### Development (từ root project)

```bash
yarn seed:ui
```

Lệnh này chạy song song:
- **Vite dev server** (port 5173) — Svelte frontend với HMR
- **Hono server** (port 4000) — API backend với `--watch`
- Vite proxy `/api` → `http://localhost:4000`

### Production

```bash
# Build Svelte frontend
cd seed-studio && npm run build

# Start server (serves built UI + API)
npm run server
```

---

## API Endpoints

| Method | Endpoint              | Mô tả                                       |
| ------ | --------------------- | -------------------------------------------- |
| GET    | `/api/seed-stream`    | SSE stream — chạy seeder script              |
| GET    | `/api/restore-stream` | SSE stream — khôi phục backup                |
| POST   | `/api/seed-article`   | Tạo article trong Strapi + append CSV        |
| GET    | `/api/seed-files`     | Liệt kê tất cả seed files                   |
| GET    | `/api/seed-file?path=`| Đọc nội dung 1 seed file                    |
| POST   | `/api/append-csv`     | Thêm dòng mới vào CSV file                  |

### Query Params cho `/api/seed-stream`

| Param       | Giá trị  | Mô tả                           |
| ----------- | -------- | -------------------------------- |
| `clean`     | `true`   | Xóa sạch rồi seed lại           |
| `clean-only`| `true`   | Chỉ xóa, không seed             |
| `token`     | `<token>`| Override STRAPI_ADMIN_TOKEN      |

---

## Biến môi trường

Đọc từ file `.env` ở thư mục cha (root project):

| Biến                  | Mặc định                | Mô tả               |
| --------------------- | ----------------------- | -------------------- |
| `STRAPI_URL`          | `http://localhost:1337`  | Strapi API URL       |
| `STRAPI_ADMIN_TOKEN`  | —                       | API Token (required) |
