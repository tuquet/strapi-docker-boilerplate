---
layout: home

hero:
  name: "LaunchPad"
  text: "Enterprise CMS Fullstack"
  tagline: "Strapi 5 + Next.js — Headless CMS sẵn sàng cho Production trong vài phút."
  image:
    src: /logo.png
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
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: linear-gradient(135deg, #646cff 0%, #9580ff 50%, #ff79c6 100%);
  --vp-home-hero-image-background-image: linear-gradient(135deg, #646cff22 0%, #9580ff22 100%);
  --vp-home-hero-image-filter: blur(44px);
}
</style>
