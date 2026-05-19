# Seed Nội Dung Bằng AI

Tool này giúp bạn **nạp nội dung thật vào CMS tự động** — thay vì nhập tay từng bài viết, sản phẩm, testimonial trên Strapi Admin.

## Khi Nào Cần Dùng?

- Bạn vừa cài LaunchPad và muốn có dữ liệu thật để demo cho khách hàng
- Bạn muốn thay thế toàn bộ demo data bằng nội dung thật của thương hiệu
- Bạn cần reset và tạo lại dữ liệu từ đầu

---

## 🚀 Cách Mới: Dùng Giao Diện (Seed Studio)

Để quá trình seed trở nên trực quan và "fancy" hơn, LaunchPad cung cấp sẵn một công cụ giao diện là **Seed Studio**.

1. Đảm bảo bạn đã cấu hình `STRAPI_ADMIN_TOKEN` trong file `strapi/.env`
2. Mở terminal ở thư mục gốc và chạy:
   ```bash
   yarn seed:ui
   ```
   *(Hoặc ấn `Ctrl + Shift + P` > **Run Task** > chọn **`🌱 seed: ui`**)*
3. Mở trình duyệt tại **http://localhost:4000**

Tại Seed Studio, bạn có thể:
- Xem Terminal Log chạy trực tiếp trên web (Pipeline Visualizer).
- Chọn linh hoạt giữa các chế độ: Update, Wipe DB, hoặc Clean & Seed.
- Nhập nhanh bài viết mới thông qua form trực quan (On-Demand Article) mà không cần chạm vào file CSV.

---

## 💻 Cách Cũ: Dùng CLI (Happy Path)

### Bước 1 — Nhờ AI tạo nội dung

Mở ChatGPT hoặc Claude, yêu cầu tạo nội dung theo format CSV:

```
Tạo nội dung cho file 06_articles.csv với cột: title, slug, description, category_name, image_url, locale, published
Viết 5 bài viết về chủ đề [chủ đề của bạn], locale = vi, published = true
```

Copy nội dung vào các file CSV trong `strapi/scripts/seed-data/`.

### Bước 2 — Lấy API Token

1. Vào **Strapi Admin** → `http://localhost:1337/admin`
2. **Settings** → **API Tokens** → **Create new token**
3. Chọn Type: **Full access** → Copy token
4. Mở `strapi/.env`, thêm dòng:

```ini
STRAPI_ADMIN_TOKEN=paste_token_vào_đây
```

### Bước 3 — Chạy Script

```bash
cd strapi

# Xem trước — không gửi API (khuyên làm trước)
node scripts/seed-from-csv.mjs --dry-run

# Seed thật
node scripts/seed-from-csv.mjs

# Xóa data cũ rồi seed lại từ đầu
node scripts/seed-from-csv.mjs --clean
```

✅ Xong! Mở http://localhost:3000 để thấy kết quả.

---

## Thứ Tự Seed & Nội Dung Hỗ Trợ

Script tự động seed **12 loại nội dung** theo đúng thứ tự phụ thuộc:

| Phase | File | Nội dung |
|:------|:-----|:---------|
| Phase 0 | `00_logos.csv` | Logo thương hiệu *(image required)* |
| Phase 1 | `01_categories.csv` | Danh mục |
| Phase 1 | `02_products.csv` | Sản phẩm |
| Phase 1 | `03_plans.csv` | Gói dịch vụ / Pricing |
| Phase 1 | `04_faqs.csv` | Câu hỏi thường gặp |
| Phase 1 | `05_testimonials.csv` | Đánh giá khách hàng |
| Phase 1 | `06_articles.csv` | Bài viết Blog |
| Phase 2 | `single-types/global.json` | Navbar, Footer toàn trang |
| Phase 2 | `single-types/blog-page.json` | Layout trang /blog |
| Phase 2 | `single-types/product-page.json` | Layout trang /products |
| Phase 3 | `pages/home.json` | Homepage (Hero, Features, Pricing...) |
| Phase 3 | `blocks/articles.json` | Nội dung chi tiết từng bài viết |

---

## Format CSV Từng File

### `00_logos.csv` — Logo thương hiệu

```csv
company,image_src
"Công ty ABC","logo-abc.png"
"Startup XYZ","https://example.com/logo.png"
```

| Cột | Mô tả |
|:----|:------|
| `company` | Tên công ty |
| `image_src` | HTTPS URL **hoặc** tên file trong `strapi/public/uploads/` |

---

### `01_categories.csv` — Danh mục

```csv
name,locale
"Technology","en"
"Marketing","en"
"Công nghệ","vi"
```

---

### `02_products.csv` — Sản phẩm

```csv
name,slug,description,price,featured,category_name,image_url,perks,locale
"Analytics Pro","analytics-pro","Phân tích dữ liệu real-time",299,true,"Technology","https://...","Feature 1|Feature 2|Feature 3","vi"
```

::: tip Cột perks
Phân tách nhiều tính năng bằng ký tự `|`. Ví dụ: `"Unlimited users|API access|24/7 support"`
:::

---

### `05_testimonials.csv` — Đánh giá khách hàng

```csv
text,user_name,user_title,user_avatar_url,locale
"Sản phẩm tuyệt vời!","Nguyễn Văn A","CEO, Công ty ABC","https://...","vi"
```

---

### `06_articles.csv` — Bài viết Blog

```csv
title,slug,description,category_name,image_url,locale,published
"Tiêu đề bài viết","tieu-de-bai-viet","Mô tả ngắn...","Technology","https://...","vi",true
```

---

## Xử Lý Hình Ảnh

Script hỗ trợ **3 cách cung cấp ảnh** cho các cột `image_url` / `image_src`:

| Cách | Ví dụ | Hoạt động như thế nào |
|:-----|:------|:----------------------|
| **HTTPS URL** | `https://images.unsplash.com/photo.jpg` | Download từ internet → upload Strapi |
| **Tên file** | `logo.png` | Tìm trong `strapi/public/uploads/` |
| **Đường dẫn** | `assets/logo.png` | Resolve từ thư mục chạy script |

::: info Idempotency — Không duplicate ảnh
Mỗi lần chạy, script kiểm tra ảnh đã tồn tại trong Media Library chưa. Nếu rồi → **bỏ qua, không upload lại**. Bạn có thể chạy script nhiều lần mà không lo bị trùng lặp.
:::

Nếu bạn có thư mục ảnh riêng, override bằng biến môi trường:

```ini
# strapi/.env
SEED_STATIC_DIR=/đường/dẫn/đến/thư/mục/ảnh
```

---

## Schema Reference

::: details Xem đầy đủ cấu trúc Collection Types

| Content Type | Fields | Relations |
|:-------------|:-------|:----------|
| **Logo** | `company`, `image` *(required)* | — |
| **Category** | `name`, `locale` | → Products, Articles |
| **Product** | `name`, `slug`, `description`, `price`, `featured`, `images`, `perks` | → Categories, Plans |
| **Plan** | `name`, `price`, `sub_text`, `featured`, `CTA`, `perks` | → Product |
| **FAQ** | `question`, `answer` | — |
| **Testimonial** | `text`, `user{firstname, lastname, job, image}` | — |
| **Article** | `title`, `slug`, `description`, `content`, `image`, `seo` | → Categories |
| **Page** | `slug`, `seo`, `dynamic_zone` | — |

:::

::: details Xem đầy đủ cấu trúc Single Types

| Single Type | Fields |
|:------------|:-------|
| **Global** | `navbar{logo, links}`, `footer{logo, description, copyright, links}` |
| **Blog-page** | `heading`, `sub_heading`, `seo`, `dynamic_zone` |
| **Product-page** | `heading`, `sub_heading`, `seo`, `dynamic_zone` |

:::
