# LaunchPad CMS — Content Type Reference

> Quick reference cho tất cả Strapi Content Types, Components và API endpoints.

---

## 1. API Endpoints

### Collection Types

| Endpoint | Method | Content Type | Middleware | Auth |
| --- | --- | --- | --- | --- |
| `/api/articles` | GET | Article | `article-populate` | Token |
| `/api/articles/:id` | GET | Article | `article-populate` | Token |
| `/api/categories` | GET | Category | — | Token |
| `/api/categories/:id` | GET | Category | — | Token |
| `/api/faqs` | GET | FAQ | — | Token |
| `/api/faqs/:id` | GET | FAQ | — | Token |
| `/api/logos` | GET | Logo | — | Token |
| `/api/logos/:id` | GET | Logo | — | Token |
| `/api/pages` | GET | Page | `page-populate` | Token |
| `/api/pages/:id` | GET | Page | `page-populate` | Token |
| `/api/plans` | GET | Plan | — | Token |
| `/api/plans/:id` | GET | Plan | — | Token |
| `/api/products` | GET | Product | `product-populate` | Token |
| `/api/products/:id` | GET | Product | `product-populate` | Token |
| `/api/redirections` | GET | Redirection | — | Token |
| `/api/redirections/:id` | GET | Redirection | — | Token |
| `/api/testimonials` | GET | Testimonial | — | Token |
| `/api/testimonials/:id` | GET | Testimonial | — | Token |

### Single Types

| Endpoint | Method | Content Type | Middleware |
| --- | --- | --- | --- |
| `/api/global` | GET | Global | `global-populate` |
| `/api/blog-page` | GET | Blog Page | `blog-page-populate` |
| `/api/product-page` | GET | Product Page | `product-page-populate` |

### System Endpoints

| Endpoint | Purpose |
| --- | --- |
| `/admin` | Strapi Admin Panel |
| `/documentation/v1.0.0` | Swagger/OpenAPI docs |
| `/uploads/*` | Media Library files |

---

## 2. Content Type Schemas (Quick Ref)

### Article

```
title:        string
description:  text (required)
slug:         uid → title
content:      blocks (rich text)
image:        media (single)
categories:   relation M2M → Category
seo:          component shared.seo
dynamic_zone: [related-articles, cta]
─── i18n: ✅  draft: ✅
```

### Category

```
name:     string
product:  relation M2O → Product
articles: relation M2M → Article (mapped)
─── i18n: ✅  draft: ❌
```

### FAQ

```
question: string
answer:   text
─── i18n: ✅  draft: ❌
```

### Logo

```
image:   media (single, images only, required)
company: string
─── i18n: ❌  draft: ❌
```

### Page

```
slug:         uid (required)
seo:          component shared.seo
dynamic_zone: [hero, features, testimonials, how-it-works, brands,
               pricing, launches, cta, form-next-to-section, faq]
─── i18n: ✅  draft: ✅
```

### Plan

```
name:             string
price:            integer
sub_text:         string
featured:         boolean (default: false)
CTA:              component shared.button
perks:            component shared.perks (repeatable)
additional_perks: component shared.perks (repeatable)
product:          relation M2O → Product
─── i18n: ✅  draft: ✅
```

### Product

```
name:         string
price:        integer
description:  string
slug:         uid → name
featured:     boolean (default: false)
images:       media (multiple)
perks:        component shared.perks (repeatable)
plans:        relation O2M → Plan
categories:   relation O2M → Category
dynamic_zone: [related-products, cta]
─── i18n: ✅  draft: ✅
```

### Redirection

```
source:      string
destination: string
─── i18n: ❌  draft: ✅
```

### Testimonial

```
text: string
user: component shared.user
─── i18n: ✅  draft: ✅
```

### Global (Single)

```
admin_title: string
add_to_cart: string
your_cart:   string
buy_now:     string
seo:         component shared.seo
navbar:      component global.navbar
footer:      component global.footer
─── i18n: ✅  draft: ✅
```

### Blog Page (Single)

```
heading:      string
sub_heading:  string
seo:          component shared.seo
dynamic_zone: [all 12 DZ types]
─── i18n: ✅  draft: ❌
```

### Product Page (Single)

```
heading:              string
sub_heading:          string
featured_heading:     string
featured_sub_heading: string
popular_heading:      string
popular_sub_heading:  string
seo:                  component shared.seo
dynamic_zone:         [all 12 DZ types]
─── i18n: ✅  draft: ❌
```

---

## 3. Component Reference

### shared.seo

```json
{
  "metaTitle": "string (max 60, required)",
  "metaDescription": "string (min 50, required)",
  "metaImage": "media",
  "keywords": "text",
  "metaRobots": "string",
  "structuredData": "json",
  "metaViewport": "string",
  "canonicalURL": "string"
}
```

### shared.button

```json
{
  "text": "string",
  "URL": "string",
  "target": "enum [_blank, _self, _parent, _top]",
  "variant": "enum [simple, outline, primary, muted] (default: primary)"
}
```

### shared.link

```json
{
  "text": "string",
  "URL": "string",
  "target": "enum [_blank, _self, _parent, _top]"
}
```

### shared.user

```json
{
  "firstname": "string",
  "lastname": "string",
  "job": "string",
  "image": "media (images only)"
}
```

### shared.perks

```json
{
  "text": "string"
}
```

### shared.steps

```json
{
  "title": "string",
  "description": "string"
}
```

### global.navbar

```json
{
  "logo": "relation O2O → Logo",
  "left_navbar_items": "repeatable shared.link",
  "right_navbar_items": "repeatable shared.link"
}
```

### global.footer

```json
{
  "logo": "relation O2O → Logo",
  "description": "string",
  "copyright": "string",
  "designed_developed_by": "string",
  "built_with": "string",
  "internal_links": "repeatable shared.link",
  "policy_links": "repeatable shared.link",
  "social_media_links": "repeatable shared.link"
}
```

---

## 4. Dynamic Zone Components

### dynamic-zone.hero

```json
{
  "heading": "string",
  "sub_heading": "string",
  "CTAs": "repeatable shared.button"
}
```

### dynamic-zone.features

```json
{
  "heading": "string",
  "sub_heading": "string",
  "globe_card": "component cards.globe-card",
  "ray_card": "component cards.ray-card",
  "graph_card": "component cards.graph-card",
  "social_media_card": "component cards.social-media-card"
}
```

### dynamic-zone.testimonials

```json
{
  "heading": "string",
  "sub_heading": "string",
  "testimonials": "relation O2M → Testimonial"
}
```

### dynamic-zone.pricing

```json
{
  "heading": "string",
  "sub_heading": "string",
  "plans": "relation O2M → Plan"
}
```

### dynamic-zone.how-it-works

```json
{
  "heading": "string",
  "sub_heading": "string",
  "steps": "repeatable shared.steps"
}
```

### dynamic-zone.brands

```json
{
  "heading": "string",
  "sub_heading": "string",
  "logos": "relation O2M → Logo"
}
```

### dynamic-zone.faq

```json
{
  "heading": "string",
  "sub_heading": "string",
  "faqs": "relation O2M → FAQ"
}
```

### dynamic-zone.cta

```json
{
  "heading": "string",
  "sub_heading": "string",
  "CTAs": "repeatable shared.button"
}
```

### dynamic-zone.launches

```json
{
  "heading": "string",
  "sub_heading": "string",
  "launches": "repeatable shared.launches"
}
```

### dynamic-zone.form-next-to-section

```json
{
  "heading": "string",
  "sub_heading": "string",
  "form": "component shared.form",
  "section": "component shared.section",
  "social_media_icon_links": "repeatable shared.social-media-icon-links"
}
```

### dynamic-zone.related-articles

```json
{
  "heading": "string",
  "sub_heading": "string",
  "articles": "relation O2M → Article"
}
```

### dynamic-zone.related-products

```json
{
  "heading": "string",
  "sub_heading": "string",
  "products": "relation O2M → Product"
}
```

---

## 5. Frontend Route ↔ Content Type Mapping

| Next.js Route | Strapi Content Type | Fetch Function |
| --- | --- | --- |
| `/[locale]/` | Page (slug: "homepage") | `fetchCollectionType('pages')` |
| `/[locale]/[slug]` | Page (by slug) | `fetchCollectionType('pages')` |
| `/[locale]/blog` | Blog Page (single) + Articles | `fetchSingleType('blog-page')` + `fetchCollectionType('articles')` |
| `/[locale]/blog/[slug]` | Article (by slug) | `fetchCollectionType('articles')` |
| `/[locale]/products` | Product Page (single) + Products | `fetchSingleType('product-page')` + `fetchCollectionType('products')` |
| `/[locale]/products/[slug]` | Product (by slug) | `fetchCollectionType('products')` |
| Layout (all pages) | Global (single) | `fetchSingleType('global')` |
