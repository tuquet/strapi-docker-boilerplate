# Triển Khai Lên VPS

Hướng dẫn này giúp bạn đưa LaunchPad lên một **máy chủ VPS Production** với tiêu chí: **Zero-Downtime, Zero-Build trên VPS**.

::: info Triết lý triển khai
VPS (thường cấu hình thấp 1–2GB RAM) **không** làm nhiệm vụ Build code. Toàn bộ quá trình đóng gói diễn ra tại máy Local. VPS chỉ cần Pull Image về và chạy.
:::

---

## Trước Khi Bắt Đầu

Hãy chuẩn bị đủ những thứ sau:

::: info Checklist chuẩn bị

- [ ] **VPS** với Ubuntu 20.04+ và tối thiểu 1GB RAM
- [ ] **Docker Engine** cài trên VPS (`curl -fsSL https://get.docker.com | sh`)
- [ ] **Docker Compose v2** (`docker compose version` để kiểm tra)
- [ ] **Private Docker Registry** — dùng LaunchPad Registry Stack hoặc bất kỳ registry nào
- [ ] Đã SSH được vào VPS (`ssh user@your-server-ip`)
      :::

---

## Kiến Trúc Triển Khai

```
┌──────────────┐     push image     ┌─────────────────┐
│  Máy Local   │ ─────────────────► │ Docker Registry │
│  (Dev)       │                    │ (Private)       │
└──────────────┘                    └─────────────────┘
       │ build                             │
       │                                   │ pull image
       ▼                                   ▼
   Code + Docker              ┌────────────────────────┐
   Images (Next.js            │     Máy chủ VPS        │
   + Strapi)                  │  docker compose up -d  │
                              └────────────────────────┘
```

**Luồng làm việc mỗi khi update:**

1. Sửa code trên máy Local
2. Build Docker Image và Push lên Registry
3. VPS Pull Image mới → Restart container

---

## Giai Đoạn 1: Build & Push từ Máy Local

### Sử dụng VS Code Task _(cách nhanh nhất)_

1. Nhấn `Ctrl + Shift + B`
2. Chọn Task: **`🐳 registry: push-all`**
3. Nhập thông tin khi được hỏi:
   - **Registry Address:** địa chỉ Private Registry của bạn (VD: `103.x.x.x:5000`)
   - **Image Tag:** phiên bản (dùng `latest` hoặc điền mã version)

::: details Không dùng VS Code? Build bằng lệnh tay

```bash
# Build image Next.js
docker build -t <registry>/launchpad-next:latest ./next

# Build image Strapi
docker build -t <registry>/launchpad-strapi:latest ./strapi

# Push cả hai
docker push <registry>/launchpad-next:latest
docker push <registry>/launchpad-strapi:latest
```

:::

---

## Giai Đoạn 2: Deploy Trên VPS

SSH vào VPS và thực hiện theo thứ tự:

### Bước 1 — Clone dự án (chỉ lần đầu)

```bash
git clone https://github.com/tuquet/launchpad-cms-fullstack.git
cd launchpad-cms-fullstack
```

### Bước 2 — Tạo file `.env`

```bash
chmod +x scripts/copy-env.sh
./scripts/copy-env.sh --env prod . ./strapi
```

Script này tự động set `COMPOSE_FILE=compose.prod.yml`, bạn không cần gõ `-f` mỗi lần.

Mở file `.env` và kiểm tra / sửa thông số Registry:

```ini
# Địa chỉ Registry (mặc định là localhost:5000 nếu Registry cùng VPS)
REGISTRY_URL=localhost:5000
IMAGE_TAG=latest
```

### Bước 3 — Pull & Start

```bash
# Tải các image mới nhất từ Registry
docker compose pull

# Khởi động toàn bộ hệ thống
docker compose up -d
```

### Bước 4 — Tắt Seed Data _(Bảo mật & Tối ưu!)_

::: tip Cơ chế Bảo vệ Đa lớp Mới
Để nâng cao trải nghiệm nhà phát triển và tránh rủi ro mất mát dữ liệu:
1. **Tự động Khóa (Lock Flag):** Khi hệ thống nạp dữ liệu thành công lần đầu, container Strapi sẽ tự động tạo một file đánh dấu `.seeded` trong thư mục persistent volume. Từ đó, dù `SEED_DATA=true` vẫn bật, container sẽ tự động bỏ qua bước seed ở các lần restart sau, đảm bảo **không bao giờ ghi đè** lên dữ liệu của bạn.
2. **Khuyến nghị Tắt Biến Host:** Sau khi cài đặt hoàn tất, bạn vẫn nên tắt biến này ở phía host `.env` bằng script để bảo mật và tối ưu thời gian khởi động:
:::

```bash
chmod +x scripts/toggle-seed.sh
./scripts/toggle-seed.sh disable
```

---

## Cập Nhật & Rollback

### Cập nhật lên phiên bản mới

```bash
# Trên máy Local: Build & Push như thường
# (Ctrl+Shift+B → registry: push-all)

# Trên VPS:
docker compose pull      # Kéo image mới
docker compose up -d     # Restart với image mới
```

### Rollback về phiên bản cũ

Nếu bản update bị lỗi, chỉ cần đổi `IMAGE_TAG` trong `.env` về tag cũ:

```bash
# Sửa IMAGE_TAG trong .env
nano .env
# Đổi: IMAGE_TAG=v1.2.0  (tag cũ của bạn)

# Khởi động lại với image cũ
docker compose pull
docker compose up -d
```

---

## Cấu Hình Nginx & HTTPS

_(Bỏ qua phần này nếu bạn không dùng LaunchPad Registry Stack)_

Container Nginx của CMS đẩy website ra **cổng 8000** (không chiếm cổng 80/443). Bạn cần cấu hình Nginx UI để trỏ domain vào đây.

### Các bước trong Nginx UI

**1.** Đăng nhập vào Nginx UI trên VPS

**2.** Tạo **Site** mới:

| Trường      | Giá trị              |
| :---------- | :------------------- |
| Server Name | `cms.yourdomain.com` |
| Listen      | `80`                 |

**3.** Trong **Locations**, tạo Proxy:

| Trường     | Giá trị                       |
| :--------- | :---------------------------- |
| Path       | `/`                           |
| Proxy Pass | `http://127.0.0.1:8000`       |
| Host       | Bật "Preserve Host" (`$host`) |

**4.** Tab **SSL** → Enable SSL (Let's Encrypt) → Điền Email → Bấm **Issue**

Sau vài giây, domain của bạn sẽ tự động có HTTPS! 🎉

---

## Xử Lý Sự Cố

### ❌ VPS báo lỗi "No space left on device"

Các lần Push/Pull nhiều lần tạo ra "rác" (dangling images). Chạy script dọn dẹp:

```bash
sh scripts/cleanup.sh
```

::: warning Lưu ý
Script này an toàn — chỉ xóa rác và container **đã dừng**, không ảnh hưởng container đang chạy.
:::

### ❌ Không kết nối được Registry

Kiểm tra Registry còn sống:

```bash
curl http://<REGISTRY_URL>/v2/_catalog
```

Nếu báo lỗi kết nối, kiểm tra firewall VPS đã mở port của Registry chưa.

### ❌ Container khởi động rồi tự tắt

Xem log để biết lý do:

```bash
docker compose logs --tail=50 strapi
docker compose logs --tail=50 launchpad-nextjs
```
