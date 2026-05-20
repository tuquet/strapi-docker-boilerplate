---
layout: home

hero:
  name: 'LaunchPad'
  text: 'Enterprise CMS Fullstack'
  tagline: 'Strapi 5 + Next.js — Headless CMS sẵn sàng cho Production trong vài phút.'
  image:
    src: /logo.svg
    alt: LaunchPad Logo
  actions:
    - theme: brand
      text: Bắt đầu ngay →
      link: /guide/getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/tuquet/launchpad-cms-fullstack

features:
  - icon: 🏗️
    title: Kiến trúc Headless
    details: Tách biệt hoàn toàn Frontend và Backend. Dễ dàng tích hợp thêm Mobile App hoặc bất kỳ hệ thống nào qua REST / GraphQL API.

  - icon: ⚡
    title: Tối ưu SEO & Hiệu năng
    details: Next.js App Router, SSR và On-demand Revalidation thông minh — website của bạn luôn nhanh và được Google ưu tiên.

  - icon: 🛡️
    title: Bảo mật tối đa
    details: Database và CMS ẩn hoàn toàn trong mạng nội bộ Docker. Nginx là điểm duy nhất tiếp nhận traffic từ internet.

  - icon: 🚀
    title: Zero-Build trên VPS
    details: Build code tại máy Local, VPS chỉ Pull và Run. Server cấu hình thấp (1–2GB RAM) vẫn chạy mượt mà.

  - icon: 🔄
    title: Auto-Deploy (Watchtower)
    details: Watchtower tự động kiểm tra phiên bản mới mỗi 2 phút. Push code xong là VPS tự cập nhật — không cần SSH vào server.

  - icon: 🌱
    title: AI Content Seeding
    details: Nạp nội dung thật vào CMS tự động bằng AI thông qua giao diện Seed Studio hoặc CLI script. Hỗ trợ 12 loại nội dung.
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: linear-gradient(135deg, #646cff 0%, #9580ff 50%, #ff79c6 100%);
  --vp-home-hero-image-background-image: linear-gradient(135deg, #646cff22 0%, #9580ff22 100%);
  --vp-home-hero-image-filter: blur(44px);
}

/* Hiệu ứng tên lửa lơ lửng phóng lên */
@keyframes floatUp {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-50px); }
  100% { transform: translateY(0px); }
}

.VPImage.image-src {
  top: 70px;
  position: relative;
  left: auto;
  right: auto;
  animation: floatUp 4s ease-in-out infinite;
  /* Thêm chút shadow mờ cho xịn */
  filter: drop-shadow(0 10px 20px rgba(149, 128, 255, 0.2));
}
</style>
