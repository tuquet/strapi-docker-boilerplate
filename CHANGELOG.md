# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Seed Studio Features**:
  - **Backup Preview**: Hỗ trợ đọc trực tiếp file backup `.tar.gz` của Strapi, phân tích metadata và thống kê số lượng các entities (Articles, Categories, Users, Media) ngay trên giao diện mà không cần giải nén thủ công trước qua endpoint `/api/backup-preview`.
  - **Backup Restore**: Cho phép kích hoạt tiến trình `strapi import` trực tiếp từ Web UI. Sử dụng **Server-Sent Events (SSE)** thông qua API `/api/restore-stream` để stream logs real-time từ server về giao diện điều khiển.
  - **On-demand Article Seeding**: Bổ sung tính năng tạo nhanh một bài viết đơn lẻ (Single Article Seeding) trực tiếp từ giao diện GUI qua API `/api/seed-article`. Tiến trình tự động gọi API Strapi để khởi tạo thực thể và đồng thời append dữ liệu vào file dữ liệu nguồn CSV (`06_articles.csv`) để đảm bảo tính nhất quán của dữ liệu seed.
  - **Premium Web UI**: Thiết kế giao diện Seed Studio trực quan, hiện đại bằng **Svelte 5** (tận dụng hệ thống Runes nâng cao như `$state`, `$derived`, `$effect`), kết hợp các hiệu ứng chuyển đổi mượt mà, micro-animations và layout tối ưu cho trải nghiệm người dùng B2B SaaS.

### Changed

- **Seed Studio Backend Refactoring**: Di chuyển toàn bộ mã nguồn backend của Seed Studio từ JavaScript ES Modules (`server.mjs`) sang **TypeScript** (`server.ts`). Tích hợp framework **Hono** gọn nhẹ thay thế cho Express-like routes cũ, tăng cường Type Safety, và cấu hình chạy trực tiếp với tính năng `--experimental-strip-types` của Node 22.
- **System Localization (i18n)**:
  - Thay đổi ngôn ngữ hỗ trợ của toàn hệ thống từ tiếng Pháp (`fr`) sang tiếng Việt (`vi`).
  - Cập nhật cấu trúc thư mục routing Next.js (`next/app/[locale]`), middleware i18n, các file dịch thuật localization, và cấu hình i18n của Strapi backend để hỗ trợ song ngữ Anh - Việt (`en` và `vi`).
- **Technical Documentation**:
  - Cập nhật **SKILLS.md**: Bổ sung mô tả chi tiết về kiến trúc Seed Studio TypeScript + Hono, hướng dẫn cách sử dụng API khôi phục dữ liệu, tạo bài viết on-demand và cập nhật cấu trúc locales mới.
  - Cập nhật **docs/AI_CONTENT_SEEDING.md**: Bổ sung phần hướng dẫn sử dụng giao diện đồ họa Seed Studio GUI (`yarn seed:ui`), giải thích chi tiết quy trình Preview Backup, Restore database bằng SSE, và On-demand Seeding.
