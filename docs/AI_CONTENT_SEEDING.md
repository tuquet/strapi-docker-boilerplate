# 🚀 AI Content Seeding — Hướng Dẫn Đầy Đủ (v2)

Tài liệu này hướng dẫn cách **thay thế toàn bộ nội dung CMS** bằng dữ liệu do AI tạo ra thông qua CSV, JSON và REST API của Strapi v5. Đồng thời giải thích chi tiết kiến trúc kỹ thuật của Seeder.

---

## 📋 Tổng Quan Hệ Thống

Hệ thống Seeder (phiên bản hybrid CSV+JSON) hỗ trợ **12/12 loại dữ liệu**, được seed theo đúng thứ tự phụ thuộc để đảm bảo tính toàn vẹn của dữ liệu:

| Phase       | Loại                  | Format | Mô tả                                                     |
| :---------- | :-------------------- | :----- | :-------------------------------------------------------- |
| **Phase 0** | Logos                 | CSV    | Logo entities (image field required — seed đầu tiên)      |
| **Phase 1** | Collection Types      | CSV    | Categories, Products, Plans, FAQs, Testimonials, Articles |
| **Phase 2** | Single Types          | JSON   | Global (Navbar/Footer), Blog-page, Product-page           |
| **Phase 3** | Pages + Dynamic Zones | JSON   | Homepage layout với Hero, Features, Pricing, FAQ sections |

### Cấu trúc thư mục

```
seed-studio/
├── seed-from-csv.mjs           # Script chính (Node.js)
└── seed-data/
    ├── 00_logos.csv             # Phase 0: Logo entities (image required)
    ├── 01_categories.csv        # Phase 1: Collection Types
    ├── 02_products.csv
    ├── 03_plans.csv
    ├── 04_faqs.csv
    ├── 05_testimonials.csv
    ├── 06_articles.csv
    ├── single-types/            # Phase 2: Single Types
    │   ├── global.json          #   → Navbar, Footer, SEO toàn cục
    │   ├── blog-page.json       #   → Layout trang /blog
    │   └── product-page.json    #   → Layout trang /products
    ├── pages/                   # Phase 3: Pages + Dynamic Zones
    │   └── home.json            #   → Homepage (Hero, Features, Pricing...)
    └── blocks/                  # Article body content
        └── articles.json        #   → Blocks content cho mỗi article
```

> [!NOTE]
> **SEED_STATIC_DIR** (mặc định: `strapi/public/uploads/`) là thư mục chứa ảnh local để seed.
> Có thể override bằng biến môi trường trong `strapi/.env`.
> Các cột `image_url` / `image_src` trong CSV chấp nhận:
>
> - **HTTPS URL**: `https://images.unsplash.com/photo.jpg`
> - **Filename**: `logo.png` → tìm trong `SEED_STATIC_DIR`
> - **Relative path**: `assets/logo.png` → resolve từ thư mục chạy script

---

## 🎯 3 Bước Thực Hiện

### Bước 1: Nhờ AI tạo nội dung

#### CSV cho Collection Types (flat data)

Yêu cầu AI (ChatGPT/Claude) tạo nội dung theo template CSV có sẵn. Các bảng hỗ trợ:

| File                  | Cột                                                                                                               | Ghi chú                                              |
| :-------------------- | :---------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------- |
| `00_logos.csv`        | `company, image_src`                                                                                              | `image_src`: HTTPS URL hoặc filename/path local      |
| `01_categories.csv`   | `name, locale`                                                                                                    | Locale: `en` hoặc `vi`                               |
| `02_products.csv`     | `name, slug, description, price, featured, category_name, image_url, perks, locale`                               | `image_url`: HTTPS URL hoặc filename local           |
| `03_plans.csv`        | `name, price, sub_text, featured, cta_label, cta_url, cta_variant, product_name, perks, additional_perks, locale` | `product_name` phải khớp tên trong `02_products.csv` |
| `04_faqs.csv`         | `question, answer, locale`                                                                                        |                                                      |
| `05_testimonials.csv` | `text, user_name, user_title, user_avatar_url, locale`                                                            | `user_avatar_url`: HTTPS URL hoặc filename local     |
| `06_articles.csv`     | `title, slug, description, category_name, image_url, locale, published`                                           | `published`: `true`/`false`                          |

#### JSON cho Single Types & Pages (nested data)

Dynamic Zone và Blocks content có cấu trúc nested phức tạp — dùng JSON thay vì CSV. Chỉnh sửa nội dung trực tiếp tại `single-types/*.json` và `pages/*.json`.

#### JSON cho Article Body Content

File `blocks/articles.json` chứa nội dung Blocks cho từng bài viết, mapping qua `slug`:

```json
[
  {
    "slug": "my-article-slug",
    "content": [
      {
        "type": "paragraph",
        "children": [{ "type": "text", "text": "Nội dung..." }]
      },
      {
        "type": "heading",
        "level": 2,
        "children": [{ "type": "text", "text": "Tiêu đề" }]
      }
    ]
  }
]
```

### Bước 2: Cấp quyền API Token

1. Vào Strapi Admin (`http://localhost:1337/admin`) > **Settings** > **API Tokens**.
2. Bấm **Create new token**, chọn Type là **Full access**.
3. Mở file `strapi/.env` (tạo mới từ `strapi/.env.example` nếu chưa có), thêm dòng:

```ini
   STRAPI_ADMIN_TOKEN=copy_token_cua_ban_vao_day
```

### Bước 3: Chạy Script

Mở terminal tại thư mục `strapi/` và chạy lệnh:

```bash
# Cài đặt thư viện nếu chưa có (chỉ cần chạy lần đầu)
yarn add csv-parse

# Chạy seed bình thường (idempotent, không tạo duplicate)
cd seed-studio && node seed-from-csv.mjs

# Xóa toàn bộ data cũ trước khi seed lại từ đầu
cd seed-studio && node seed-from-csv.mjs --clean

# Preview — in ra console dữ liệu sẽ tạo mà không gửi API
cd seed-studio && node seed-from-csv.mjs --dry-run
```

### Bước 4: Sử Dụng Giao Diện (Seed Studio UI)

Thay vì dùng lệnh CLI, bạn có thể chạy giao diện đồ họa **Seed Studio** để có trải nghiệm trực quan:

```bash
yarn seed:ui
```

Truy cập `http://localhost:5173` (hoặc `4000`) trên trình duyệt, bạn sẽ có các tính năng nâng cao:

1. **Pipeline Visualizer:** Xem log (SSE) theo thời gian thực khi chạy seed data.
2. **Khôi Phục Dữ Liệu (Backup Restore):**
   - Đọc trước cấu trúc file `.tar.gz` trong thư mục `strapi/data/` để biết bên trong có bao nhiêu Articles, Categories, Users.
   - Nhấn nút khôi phục để hệ thống tự động chạy `strapi import`.
3. **Tạo Bài Viết (On-demand Article Creator):** Nhập tiêu đề, mô tả và nội dung; Seed Studio sẽ gọi API tạo ngay bài viết trên Strapi, đồng thời append (lưu trữ) dòng dữ liệu mới vào file `06_articles.csv`.

---

## ⚙️ Kiến Trúc Script & Tính Năng Nâng Cao

Hệ thống được thiết kế để hoạt động tin cậy, tự động hóa cao và an toàn với dữ liệu.

### 1. Hybrid CSV + JSON Architecture

- Sử dụng **CSV** cho các Collection Types phẳng để dễ dàng thao tác bằng Excel/AI.
- Sử dụng **JSON** kết hợp `PUT` request cho Single Types và các nested objects (Dynamic Zones, Blocks content) vì CSV không thể mô tả hiệu quả các cấu trúc này.

### 2. Auto-Publish Flow (`publishedAt`)

Các content type có cấu hình `draftAndPublish: true` (Products, Plans, Testimonials, Articles) mặc định sẽ bị ẩn trên Frontend nếu ở trạng thái Draft.

- Script **tự động chèn field `publishedAt`** vào payload POST.
- Dữ liệu sau khi seed xong sẽ ngay lập tức hiển thị trên Next.js frontend mà không cần publisher vào CMS duyệt thủ công.

### 3. Dynamic Zone Injection

Trang Homepage (`pages/home.json`) sử dụng placeholder references linh hoạt:

- `_plans_ref: "INJECT_PLAN_IDS"` → Seeder tự động thay bằng ID của các Plans vừa tạo.
- `_testimonials_ref: "INJECT_TESTIMONIAL_IDS"` → Tự động thay bằng ID các Testimonials.
- `_faqs_ref: "INJECT_FAQ_IDS"` → Tự động thay bằng ID các FAQs.
  _Điều này cho phép xây dựng layout page mà không cần hard-code các relational IDs._

### 4. Idempotency (Chống trùng lặp)

Script sử dụng hàm `findExisting()` để kiểm tra entity đã tồn tại (bằng `name`, `slug`, hoặc `question`) trước khi thực hiện `POST`. Việc chạy lại script nhiều lần là hoàn toàn an toàn và **không tạo ra bản ghi trùng lặp**.

### 5. Cleanup Mode (`--clean`)

Flag `--clean` thực hiện quy trình tự động xóa sạch toàn bộ Collection Types theo thứ tự **ngược phụ thuộc** để tránh lỗi Foreign Key Constraint:

```
Pages → Articles → Plans → Products → Testimonials → FAQs → Categories → Logos
```

### 6. Image Seeding Canonical

`resolveImage()` là hàm core xử lý ảnh thống nhất:

- **HTTPS URL** → fetch từ internet
- **Local path/filename** → đọc từ `SEED_STATIC_DIR` (mặc định `strapi/public/uploads/`)
- **MIME type chính xác** → map extension `.jpg/.png/.webp/.svg` → đúng Content-Type
- **Idempotency** → check Media Library trước khi upload, tránh tạo file trùng lặp

---

## 📸 Xử Lý Hình Ảnh — Image Seeding Canonical

Script sử dụng hàm `resolveImage()` để seed ảnh một cách **canonical** vào Strapi Media Library, hỗ trợ cả hai nguồn:

### Nguồn ảnh được hỗ trợ

| Loại              | Ví dụ giá trị CSV                       | Hành vi                                                         |
| :---------------- | :-------------------------------------- | :-------------------------------------------------------------- |
| **HTTPS URL**     | `https://images.unsplash.com/photo.jpg` | Download từ internet, upload lên Strapi                         |
| **Filename**      | `logo.png`                              | Tìm trong `SEED_STATIC_DIR` (default: `strapi/public/uploads/`) |
| **Relative path** | `assets/logo.png`                       | Resolve từ thư mục chạy script                                  |
| **Absolute path** | `/data/images/logo.png`                 | Đọc trực tiếp từ đường dẫn                                      |

### Luồng xử lý

```
image_url / image_src (CSV)
       │
       ▼
  resolveImage(src, name)
       │
       ├─ Detect type
       │   ├── "https://" → fetch remote
       │   └── filename/path → read local file
       │
       ▼
  findExistingMedia(safeName)   ← Idempotency check
       │
       ├── Found  → return existing.id  [SKIP UPLOAD]
       │
       └── Not found → multipart upload → /api/upload
                             │
                             ▼
                    return uploaded.id  [CREATE]
```

### Idempotency — Không duplicate ảnh

Mỗi lần chạy, `resolveImage()` kiểm tra `GET /api/upload/files?filters[name][$eq]=safeName` trước khi upload. Nếu ảnh đã tồn tại trong Media Library, script **skip upload** và tái sử dụng ID hiện có.

### Cấu hình thư mục ảnh local

Thêm vào `strapi/.env` nếu muốn trỏ đến thư mục khác:

```ini
# Mặc định: strapi/public/uploads/
SEED_STATIC_DIR=/path/to/your/custom/seed-images
```

---

## 📊 Schema Reference — Toàn Bộ Content Types

### Collection Types

| Content Type    | Fields                                                          | Relations              | Dynamic Zone                                                                                            |
| :-------------- | :-------------------------------------------------------------- | :--------------------- | :------------------------------------------------------------------------------------------------------ |
| **Category**    | `name`                                                          | → Product, ↔ Articles | —                                                                                                       |
| **Product**     | `name, slug, description, price, featured, images, perks`       | → Categories, → Plans  | `related-products, cta`                                                                                 |
| **Plan**        | `name, price, sub_text, featured, CTA, perks, additional_perks` | → Product              | —                                                                                                       |
| **FAQ**         | `question, answer`                                              | —                      | —                                                                                                       |
| **Testimonial** | `text, user{firstname, lastname, job, image}`                   | —                      | —                                                                                                       |
| **Article**     | `title, slug, description, content(blocks), image, seo`         | ↔ Categories          | `related-articles, cta`                                                                                 |
| **Page**        | `slug, seo`                                                     | —                      | `hero, features, testimonials, how-it-works, brands, pricing, launches, cta, form-next-to-section, faq` |
| **Logo**        | `company, image(required)`                                      | —                      | —                                                                                                       |

### Single Types

| Single Type      | Fields                                                                                                                |
| :--------------- | :-------------------------------------------------------------------------------------------------------------------- |
| **Global**       | `admin_title, seo, navbar{logo, links}, footer{logo, description, copyright, links}, add_to_cart, your_cart, buy_now` |
| **Blog-page**    | `heading, sub_heading, seo, dynamic_zone`                                                                             |
| **Product-page** | `heading, sub_heading, featured_heading/sub, popular_heading/sub, seo, dynamic_zone`                                  |
