import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

export default withMermaid(defineConfig({
  // ─── Site Metadata ────────────────────────────────────────────────────────
  // base: GitHub Pages host tại /<repo-name>/ → set VITEPRESS_BASE trong CI
  // Local dev không cần set (mặc định là "/")
  base: process.env.VITEPRESS_BASE ?? '/',
  // Bỏ qua dead link check cho localhost (không resolve được trong CI)
  ignoreDeadLinks: [/^https?:\/\/localhost/],
  lang: 'vi-VN',
  title: 'LaunchPad',
  description:
    'Tài liệu hướng dẫn đầy đủ cho LaunchPad CMS Fullstack — Headless CMS Enterprise với Strapi 5 + Next.js.',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#646cff' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'LaunchPad Docs' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'Hướng dẫn cài đặt, phát triển và triển khai LaunchPad CMS Fullstack.',
      },
    ],
  ],

  // ─── Theme Config ─────────────────────────────────────────────────────────
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'LaunchPad',

    // Navigation top bar
    nav: [
      { text: 'Trang chủ', link: '/' },
      { text: 'Hướng dẫn', link: '/guide/getting-started' },
      {
        text: 'Liên kết',
        items: [
          {
            text: 'GitHub',
            link: 'https://github.com/tuquet/launchpad-cms-fullstack',
          },
          {
            text: 'Registry Stack',
            link: 'https://github.com/tuquet/launchpad-registry-stack',
          },
          {
            text: 'Mobile Native',
            link: 'https://github.com/tuquet/launchpad-mobile-native',
          },
        ],
      },
    ],

    // Sidebar phân cấp 3 nhóm
    sidebar: [
      {
        text: '🚀 Bắt Đầu',
        items: [
          { text: 'Giới thiệu & Cài đặt', link: '/guide/getting-started' },
          { text: 'Kiến Trúc Hệ Thống', link: '/guide/architecture' },
        ],
      },
      {
        text: '💻 Phát Triển',
        items: [
          { text: 'Local Development', link: '/guide/local-dev' },
          { text: 'Seed Nội Dung (AI)', link: '/guide/content-seeding' },
        ],
      },
      {
        text: '🌐 Vận Hành',
        items: [
          { text: 'Triển khai lên VPS', link: '/guide/deploy' },
          { text: 'Hạ Tầng Registry Stack', link: '/guide/registry-stack' },
          { text: 'Nâng cấp Strapi', link: '/guide/upgrade-strapi' },
        ],
      },
    ],

    // Social links (top-right)
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/tuquet/launchpad-cms-fullstack',
      },
    ],

    // Search nội bộ (không cần Algolia)
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: 'Tìm kiếm',
                buttonAriaLabel: 'Tìm kiếm tài liệu',
              },
              modal: {
                noResultsText: 'Không tìm thấy kết quả cho',
                resetButtonTitle: 'Xóa từ khóa',
                footer: {
                  selectText: 'để chọn',
                  navigateText: 'để di chuyển',
                },
              },
            },
          },
        },
      },
    },

    // Footer
    footer: {
      message: 'Được xây dựng với ❤️ bởi đội ngũ LaunchPad.',
      copyright: 'MIT License © 2024–present',
    },

    // Edit link trỏ GitHub
    editLink: {
      pattern:
        'https://github.com/tuquet/launchpad-cms-fullstack/edit/main/docs/:path',
      text: 'Chỉnh sửa trang này trên GitHub',
    },

    // Last updated
    lastUpdated: {
      text: 'Cập nhật lần cuối',
      formatOptions: { dateStyle: 'short', timeStyle: 'short' },
    },

    // Prev / Next navigation
    docFooter: {
      prev: '← Trang trước',
      next: 'Trang tiếp →',
    },

    // Outline (Table of contents)
    outline: {
      label: 'Mục lục trang này',
      level: [2, 3],
    },
  },

  // ─── Markdown Extensions ──────────────────────────────────────────────────
  markdown: {
    theme: { light: 'github-light', dark: 'github-dark' },
    lineNumbers: true,
  },

  // ─── Mermaid Options ──────────────────────────────────────────────────────
  mermaid: {
    theme: 'default',
  },
}));
