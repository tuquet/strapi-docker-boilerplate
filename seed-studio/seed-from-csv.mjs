/**
 * AI Content Seeder v2
 * ──────────────────────────────────────────────────────────────────────────────
 * Đọc CSV + JSON từ ./scripts/seed-data/ và đẩy vào Strapi REST API
 * theo đúng thứ tự phụ thuộc (dependency order).
 *
 * Hỗ trợ:
 *   - Collection Types (CSV): Logos, Categories, Products, Plans, FAQs, Testimonials, Articles
 *   - Single Types (JSON): Global, Blog-page, Product-page
 *   - Pages + Dynamic Zones (JSON): Homepage
 *   - Article Blocks content (JSON)
 *   - Image seeding từ HTTPS URL hoặc Local Static Path (SEED_STATIC_DIR)
 *   - Media Library idempotency (không upload duplicate)
 *   - Idempotency (check-and-skip by slug/name)
 *   - Cleanup mode (--clean)
 *   - Auto-publish cho draft-enabled types
 *
 * Cách chạy (đứng tại thư mục /strapi):
 *   node scripts/seed-from-csv.mjs
 *   node scripts/seed-from-csv.mjs --clean     # Xóa data cũ trước khi seed
 *   node scripts/seed-from-csv.mjs --dry-run   # Preview, không gửi API
 *
 * Yêu cầu:
 *   - Strapi đang chạy (mặc định http://localhost:1337)
 *   - File strapi/.env có STRAPI_ADMIN_TOKEN (Full-access API Token)
 *   - Cài thư viện: yarn add csv-parse
 *
 * Cấu hình ảnh local (tuỳ chọn):
 *   - SEED_STATIC_DIR: thư mục chứa ảnh static để seed (default: strapi/public/uploads/)
 *   - Trong CSV, cột image_url/image_src chấp nhận:
 *       → HTTPS URL  : "https://images.unsplash.com/photo.jpg"
 *       → Filename   : "logo.png"          (tìm trong SEED_STATIC_DIR)
 *       → Rel. path  : "assets/logo.png"   (resolve từ CWD)
 * ──────────────────────────────────────────────────────────────────────────────
 */
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const FLAG_CLEAN = args.includes('--clean');
const FLAG_DRY_RUN = args.includes('--dry-run');

// Đọc .env thủ công
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && !process.env[key]) {
      process.env[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
    }
  }
}

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_ADMIN_TOKEN;
const SEED_DIR = path.join(__dirname, 'seed-data');
const DEFAULT_LOCALE = 'en';

// Thư mục chứa ảnh static local để seed.
// Mặc định: seed-content/ — override bằng SEED_STATIC_DIR env var.
const STATIC_DIR =
  process.env.SEED_STATIC_DIR ||
  path.join(__dirname, '..', 'seed-content');

// ─── UTILS ────────────────────────────────────────────────────────────────────

const log = {
  info: (msg) => console.log(`\n📂 ${msg}`),
  ok: (id, label) => console.log(`  ✅ [ID:${id}] ${label}`),
  skip: (msg) => console.log(`  ⚠️  ${msg}`),
  error: (endpoint, msg) => console.error(`  ❌ [${endpoint}] ${msg}`),
  section: (msg) => console.log(`\n${'─'.repeat(60)}\n🚀 ${msg}`),
  dry: (endpoint, label) => console.log(`  🔍 [DRY-RUN] ${endpoint}: ${label}`),
  clean: (endpoint, count) =>
    console.log(`  🗑️  [${endpoint}] Xóa ${count} bản ghi`),
};

/** Đọc file CSV */
const readCsv = (filename) => {
  const filePath = path.join(SEED_DIR, filename);
  if (!fs.existsSync(filePath)) {
    log.skip(`File không tồn tại, bỏ qua: ${filename}`);
    return [];
  }
  return parse(fs.readFileSync(filePath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    comment: '#',
  });
};

/** Đọc file JSON */
const readJson = (relativePath) => {
  const filePath = path.join(SEED_DIR, relativePath);
  if (!fs.existsSync(filePath)) {
    log.skip(`File không tồn tại, bỏ qua: ${relativePath}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

/** POST request tới Strapi */
const post = async (endpoint, data) => {
  if (FLAG_DRY_RUN) {
    log.dry(endpoint, JSON.stringify(data).slice(0, 100));
    return { id: 0, documentId: 'dry-run' };
  }
  // Strapi v5: locale phải gửi qua query param cho non-default locales
  const locale = data.locale && data.locale !== DEFAULT_LOCALE ? data.locale : '';
  const url = `${STRAPI_URL}/api/${endpoint}${locale ? `?locale=${locale}` : ''}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({ data }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      let errMsg = errBody;
      try {
        errMsg = JSON.parse(errBody)?.error?.message || errBody;
      } catch {
        /* */
      }
      log.error(endpoint, `HTTP ${res.status} — ${errMsg}`);
      return null;
    }
    const json = await res.json();
    return json.data ?? null;
  } catch (err) {
    log.error(endpoint, `Network error — ${err.message}`);
    return null;
  }
};

/** PUT request tới Strapi (cho Single Types) */
const put = async (endpoint, data, locale = '') => {
  if (FLAG_DRY_RUN) {
    log.dry(`PUT ${endpoint}`, JSON.stringify(data).slice(0, 100));
    return { id: 0 };
  }
  // Strapi v5: locale phải gửi qua query param cho non-default locales
  const localeParam = locale && locale !== DEFAULT_LOCALE ? locale : '';
  const url = `${STRAPI_URL}/api/${endpoint}${localeParam ? `?locale=${localeParam}` : ''}`;
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({ data }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      let errMsg = errBody;
      try {
        errMsg = JSON.parse(errBody)?.error?.message || errBody;
      } catch {
        /* */
      }
      log.error(endpoint, `HTTP ${res.status} — ${errMsg}`);
      return null;
    }
    const json = await res.json();
    return json.data ?? null;
  } catch (err) {
    log.error(endpoint, `Network error — ${err.message}`);
    return null;
  }
};

/**
 * PUT request cho Collection Types — dùng để tạo/update localization variant
 * URL: PUT /api/:endpoint/:documentId?locale=vi
 */
const putDoc = async (endpoint, documentId, data, locale = '') => {
  if (FLAG_DRY_RUN) {
    log.dry(`PUT ${endpoint}/${documentId}`, JSON.stringify(data).slice(0, 100));
    return { id: 0, documentId };
  }
  const localeParam = locale && locale !== DEFAULT_LOCALE ? locale : '';
  const url = `${STRAPI_URL}/api/${endpoint}/${documentId}${localeParam ? `?locale=${localeParam}` : ''}`;
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({ data }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      let errMsg = errBody;
      try {
        errMsg = JSON.parse(errBody)?.error?.message || errBody;
      } catch {
        /* */
      }
      log.error(`${endpoint}/${documentId}`, `HTTP ${res.status} — ${errMsg}`);
      return null;
    }
    const json = await res.json();
    return json.data ?? null;
  } catch (err) {
    log.error(`${endpoint}/${documentId}`, `Network error — ${err.message}`);
    return null;
  }
};

/** GET request — lấy danh sách entities */
const getAll = async (endpoint, params = '') => {
  const url = `${STRAPI_URL}/api/${endpoint}?pagination[pageSize]=100${params ? '&' + params : ''}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
};

/** DELETE request — hỗ trợ locale param cho Strapi v5 */
const del = async (endpoint, documentId, locale) => {
  if (FLAG_DRY_RUN) return;
  const localeParam = locale ? `?locale=${locale}` : '';
  const url = `${STRAPI_URL}/api/${endpoint}/${documentId}${localeParam}`;
  try {
    await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });
  } catch {
    /* silent */
  }
};

/** Xóa toàn bộ data của một endpoint (bao gồm tất cả locales) */
const cleanEndpoint = async (endpoint) => {
  // Strapi v5: query từng locale rồi delete với locale param tường minh
  let count = 0;

  // Delete VI locale first (non-default), then EN (default)
  for (const locale of ['vi', 'en']) {
    const items = await getAll(endpoint, `locale=${locale}`);
    for (const item of items) {
      await del(endpoint, item.documentId, locale);
      count++;
    }
  }

  if (count > 0) log.clean(endpoint, count);
};

/** Map file extension → MIME type chính xác */
const getMimeType = (ext) =>
  ({
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  })[ext.toLowerCase()] ?? 'application/octet-stream';

/**
 * Idempotency check cho Strapi Media Library.
 * Strapi lưu file với tên dạng "safeName" — nếu đã tồn tại, skip upload.
 * Lưu ý: Strapi /api/upload/files trả về array trực tiếp, không wrap .data
 */
const findExistingMedia = async (filename) => {
  if (FLAG_DRY_RUN) return null;
  const url = `${STRAPI_URL}/api/upload/files?filters[name][$eq]=${encodeURIComponent(filename)}&pagination[pageSize]=1`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    // Upload API trả về array trực tiếp (không phải { data: [] })
    return Array.isArray(json) ? (json[0] ?? null) : null;
  } catch {
    return null;
  }
};

/**
 * Resolve & upload ảnh từ HTTPS URL hoặc local static path vào Strapi Media Library.
 *
 * @param {string} src  - HTTPS URL | filename ("logo.png") | relative/absolute path
 * @param {string} name - Tên gợi ý để tạo safeName (dùng làm idempotency key)
 * @returns {number|null} Strapi file ID (integer) để gán vào relation field
 *
 * Source types được hỗ trợ:
 *   - Remote : "https://images.unsplash.com/photo.jpg"
 *   - Filename: "logo.png"         → tìm trong STATIC_DIR
 *   - Rel path: "assets/logo.png"  → resolve từ process.cwd()
 *   - Abs path: "/data/logo.png"   → dùng trực tiếp
 */
const resolveImage = async (src, name) => {
  if (FLAG_DRY_RUN) return 0;
  if (!src) return null;

  const isRemote = /^https?:\/\//i.test(src);

  // ── 1. Xác định extension & safeName ──────────────────────────────────────
  let ext = '';
  let resolvedSrc = src;

  if (isRemote) {
    try {
      ext = path.extname(new URL(src).pathname) || '.jpg';
    } catch {
      ext = '.jpg';
    }
  } else {
    // Local: nếu không phải absolute path → thử resolve từ STATIC_DIR
    if (!path.isAbsolute(src) && !fs.existsSync(src)) {
      // Thử full relative path trước, rồi fallback sang basename
      const fullRelPath = path.join(STATIC_DIR, src);
      if (fs.existsSync(fullRelPath)) {
        resolvedSrc = fullRelPath;
      } else {
        resolvedSrc = path.join(STATIC_DIR, path.basename(src));
      }
    }
    ext = path.extname(resolvedSrc) || '.jpg';
  }

  const safeName = (name || 'image').replace(/[^a-zA-Z0-9-_]/g, '_') + ext;

  // ── 2. Idempotency: skip nếu file đã tồn tại trong Media Library ──────────
  const existing = await findExistingMedia(safeName);
  if (existing) {
    log.skip(`Ảnh đã có trong Media Library: ${safeName} (ID:${existing.id})`);
    return existing.id;
  }

  // ── 3. Lấy buffer ─────────────────────────────────────────────────────────
  let buffer;
  if (isRemote) {
    try {
      const imgRes = await fetch(resolvedSrc);
      if (!imgRes.ok) {
        log.skip(`Không tải được ảnh từ URL: ${resolvedSrc}`);
        return null;
      }
      buffer = Buffer.from(await imgRes.arrayBuffer());
    } catch (err) {
      log.skip(`Lỗi fetch ảnh [${resolvedSrc}]: ${err.message}`);
      return null;
    }
  } else {
    if (!fs.existsSync(resolvedSrc)) {
      log.skip(`File ảnh không tồn tại: ${resolvedSrc}`);
      return null;
    }
    buffer = fs.readFileSync(resolvedSrc);
  }

  // ── 4. Upload lên Strapi Media Library ────────────────────────────────────
  const mimeType = getMimeType(ext);
  const boundary = '----FormBoundary' + Date.now();
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${safeName}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([
    Buffer.from(header),
    buffer,
    Buffer.from(footer),
  ]);

  try {
    const res = await fetch(`${STRAPI_URL}/api/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });
    if (!res.ok) {
      const errText = await res.text();
      let errMsg = errText;
      try {
        errMsg = JSON.parse(errText)?.error?.message || errText;
      } catch {
        /* */
      }
      log.skip(
        `Upload ảnh thất bại [${safeName}]: HTTP ${res.status} — ${errMsg.slice(0, 120)}`
      );
      return null;
    }
    const json = await res.json();
    const uploaded = json[0];
    if (uploaded) {
      log.ok(uploaded.id, `📸 Uploaded: ${safeName}`);
      return uploaded.id;
    }
    return null;
  } catch (err) {
    log.skip(`Lỗi upload ảnh [${safeName}]: ${err.message}`);
    return null;
  }
};

/** Parse pipe-separated thành mảng { text } */
const parsePerks = (raw) =>
  (raw || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((text) => ({ text }));

/** Check entity đã tồn tại chưa (by field) */
const findExisting = async (endpoint, field, value) => {
  const items = await getAll(
    endpoint,
    `filters[${field}][$eq]=${encodeURIComponent(value)}`
  );
  return items.length > 0 ? items[0] : null;
};

/** Tìm entity đã tồn tại theo field + locale (cho bilingual CSV) */
const findExistingWithLocale = async (endpoint, field, value, locale) => {
  const items = await getAll(
    endpoint,
    `filters[${field}][$eq]=${encodeURIComponent(value)}&locale=${locale || DEFAULT_LOCALE}`
  );
  return items.length > 0 ? items[0] : null;
};

// ─── SEEDERS ──────────────────────────────────────────────────────────────────

/**
 * Seed Logo entities từ 00_logos.csv.
 * Logo có field `image` là required — nên chạy trước tất cả các seeder khác.
 * Cột `image_src` chấp nhận: HTTPS URL, filename trong STATIC_DIR, hoặc path tuyệt đối.
 */
const seedLogos = async () => {
  log.info('Seeding Logos...');
  const rows = readCsv('00_logos.csv');
  if (rows.length === 0) {
    log.skip('Bỏ qua: 00_logos.csv không có dữ liệu');
    return;
  }
  for (const row of rows) {
    if (!row.company) {
      log.skip('Bỏ qua dòng Logo không có company');
      continue;
    }
    const existing = await findExisting('logos', 'company', row.company);
    if (existing) {
      log.skip(`Logo đã tồn tại: ${row.company} (ID:${existing.id})`);
      continue;
    }

    if (!row.image_src) {
      log.skip(`Bỏ qua Logo "${row.company}" — thiếu image_src (required)`);
      continue;
    }

    const imageId = await resolveImage(row.image_src, `logo-${row.company}`);
    if (!imageId) {
      log.skip(
        `Bỏ qua Logo "${row.company}" — không resolve được ảnh từ: ${row.image_src}`
      );
      continue;
    }

    const created = await post('logos', {
      company: row.company,
      image: imageId,
    });
    if (created) log.ok(created.id, `Logo: ${row.company}`);
  }
};

const seedCategories = async () => {
  log.info('Seeding Categories...');
  const rows = readCsv('01_categories.csv');
  /**
   * Map category name → documentId (Strapi v5 dùng documentId cho relations,
   * đặc biệt quan trọng khi link cross-locale entities)
   */
  const map = {};
  for (const row of rows) {
    if (!row.name) {
      log.skip('Bỏ qua dòng không có name');
      continue;
    }
    const existing = await findExisting('categories', 'name', row.name);
    if (existing) {
      map[row.name] = existing.documentId;
      log.skip(`Đã tồn tại: ${row.name} (docId:${existing.documentId})`);

      // Đảm bảo locale VI cũng tồn tại (dùng PUT để tạo localization variant)
      const viExisting = await findExistingWithLocale('categories', 'name', row.name, 'vi');
      if (!viExisting) {
        await putDoc('categories', existing.documentId, { name: row.name }, 'vi');
        log.ok('', `${row.name} [vi] localized`);
      }
      continue;
    }

    // Tạo EN (default locale)
    const created = await post('categories', {
      name: row.name,
      locale: DEFAULT_LOCALE,
    });
    if (created) {
      map[row.name] = created.documentId;
      log.ok(created.id, row.name);

      // Tạo VI locale variant bằng PUT (cùng documentId)
      await putDoc('categories', created.documentId, { name: row.name }, 'vi');
      log.ok('', `${row.name} [vi] localized`);
    }
  }
  return map;
};

const seedProducts = async (categoryMap) => {
  log.info('Seeding Products...');
  const rows = readCsv('02_products.csv');

  /**
   * Map product name → documentId (shared between EN and VI locale variants)
   * Strategy: Seed EN first (POST), then VI as localization variant (PUT)
   */
  const map = {};

  // Tách EN và VI rows
  const enRows = rows.filter((r) => (r.locale || DEFAULT_LOCALE) === DEFAULT_LOCALE);
  const viRows = rows.filter((r) => r.locale === 'vi');

  // Phase 1: Seed EN products
  for (const row of enRows) {
    if (!row.name) continue;

    const existing = await findExistingWithLocale('products', 'name', row.name, 'en');
    if (existing) {
      map[row.name] = existing.documentId;
      log.skip(`Đã tồn tại: ${row.name} [en] (docId:${existing.documentId})`);
      continue;
    }

    const categoryId = categoryMap[row.category_name];
    let imageId = null;
    if (row.image_url) {
      imageId = await resolveImage(row.image_url, `product-${row.slug || row.name}`);
    }

    const payload = {
      name: row.name,
      slug: row.slug || row.name.toLowerCase().replace(/\s+/g, '-'),
      description: row.description || '',
      price: parseInt(row.price, 10) || 0,
      featured: row.featured === 'true',
      perks: parsePerks(row.perks),
      categories: categoryId ? [categoryId] : [],
      publishedAt: new Date().toISOString(),
    };
    if (imageId) payload.images = [imageId];

    const created = await post('products', payload);
    if (created) {
      map[row.name] = created.documentId;
      log.ok(created.id, `${row.name} [en]`);
    }
  }

  // Phase 2: Seed VI products as localization variants
  for (const row of viRows) {
    if (!row.name) continue;
    const docId = map[row.name];
    if (!docId) {
      log.skip(`Không tìm thấy EN product cho: ${row.name} [vi]`);
      continue;
    }

    const viExisting = await findExistingWithLocale('products', 'name', row.name, 'vi');
    if (viExisting) {
      log.skip(`Đã tồn tại: ${row.name} [vi]`);
      continue;
    }

    const categoryId = categoryMap[row.category_name];
    let imageId = null;
    if (row.image_url) {
      imageId = await resolveImage(row.image_url, `product-${row.slug || row.name}`);
    }

    const payload = {
      name: row.name,
      slug: row.slug || row.name.toLowerCase().replace(/\s+/g, '-'),
      description: row.description || '',
      price: parseInt(row.price, 10) || 0,
      featured: row.featured === 'true',
      perks: parsePerks(row.perks),
      categories: categoryId ? [categoryId] : [],
      publishedAt: new Date().toISOString(),
    };
    if (imageId) payload.images = [imageId];

    const result = await putDoc('products', docId, payload, 'vi');
    if (result) log.ok(result.id, `${row.name} [vi] localized`);
  }

  return map;
};

const seedPlans = async (productMap) => {
  log.info('Seeding Plans...');
  const rows = readCsv('03_plans.csv');
  const map = {};

  const enRows = rows.filter((r) => (r.locale || DEFAULT_LOCALE) === DEFAULT_LOCALE);
  const viRows = rows.filter((r) => r.locale === 'vi');

  const buildPlanPayload = (row) => ({
    name: row.name,
    price: parseInt(row.price, 10) || 0,
    sub_text: row.sub_text || '',
    featured: row.featured === 'true',
    CTA: {
      text: row.cta_label || '',
      URL: row.cta_url || '/',
      variant: row.cta_variant || 'primary',
    },
    perks: parsePerks(row.perks),
    additional_perks: parsePerks(row.additional_perks),
    product: productMap[row.product_name] ?? null,
    publishedAt: new Date().toISOString(),
  });

  // Phase 1: Seed EN plans
  for (const row of enRows) {
    if (!row.name) continue;
    const existing = await findExistingWithLocale('plans', 'name', row.name, 'en');
    if (existing) {
      map[row.name] = existing.documentId;
      log.skip(`Đã tồn tại: ${row.name} [en] (docId:${existing.documentId})`);
      continue;
    }
    const created = await post('plans', buildPlanPayload(row));
    if (created) {
      map[row.name] = created.documentId;
      log.ok(created.id, `${row.name} [en] (of: ${row.product_name})`);
    }
  }

  // Phase 2: Seed VI plans as localization variants
  for (const row of viRows) {
    if (!row.name) continue;
    const docId = map[row.name];
    if (!docId) {
      log.skip(`Không tìm thấy EN plan cho: ${row.name} [vi]`);
      continue;
    }
    const viExisting = await findExistingWithLocale('plans', 'name', row.name, 'vi');
    if (viExisting) {
      log.skip(`Đã tồn tại: ${row.name} [vi]`);
      continue;
    }
    const result = await putDoc('plans', docId, buildPlanPayload(row), 'vi');
    if (result) log.ok(result.id, `${row.name} [vi] localized`);
  }

  return map;
};

const seedFaqs = async () => {
  log.info('Seeding FAQs...');
  const rows = readCsv('04_faqs.csv');
  const map = {};
  for (const row of rows) {
    if (!row.question) {
      log.skip('Bỏ qua dòng không có question');
      continue;
    }
    const existing = await findExisting('faqs', 'question', row.question);
    if (existing) {
      map[`${row.locale || DEFAULT_LOCALE}:${row.question}`] = existing.documentId;
      log.skip(`Đã tồn tại: ${row.question.slice(0, 40)}...`);
      continue;
    }
    const created = await post('faqs', {
      question: row.question,
      answer: row.answer || '',
      locale: row.locale || DEFAULT_LOCALE,
    });
    if (created) {
      map[`${row.locale || DEFAULT_LOCALE}:${row.question}`] = created.documentId;
      log.ok(created.id, row.question.slice(0, 60));
    }
  }
  return map;
};

const seedTestimonials = async () => {
  log.info('Seeding Testimonials...');
  const rows = readCsv('05_testimonials.csv');
  const map = {};
  for (const row of rows) {
    if (!row.text) {
      log.skip('Bỏ qua dòng không có text');
      continue;
    }
    const existing = await findExisting('testimonials', 'text', row.text);
    if (existing) {
      map[`${existing.locale || row.locale || DEFAULT_LOCALE}:${row.user_name}`] = existing.documentId;
      log.skip(`Đã tồn tại: ${row.user_name}`);
      continue;
    }

    const nameParts = (row.user_name || '').trim().split(' ');
    const lastname = nameParts.pop() || '';
    const firstname = nameParts.join(' ') || lastname;

    let imageId = null;
    if (row.user_avatar_url) {
      imageId = await resolveImage(
        row.user_avatar_url,
        `avatar-${firstname}-${lastname}`
      );
    }

    const userPayload = { firstname, lastname, job: row.user_title || '' };
    if (imageId) {
      userPayload.image = imageId;
    }

    const created = await post('testimonials', {
      text: row.text,
      locale: row.locale || DEFAULT_LOCALE,
      user: userPayload,
      publishedAt: new Date().toISOString(),
    });
    if (created) {
      map[`${row.locale || DEFAULT_LOCALE}:${row.user_name}`] = created.documentId;
      log.ok(created.id, row.user_name || '(no name)');
    }
  }
  return map;
};

const seedArticles = async (categoryMap) => {
  log.info('Seeding Articles...');
  const rows = readCsv('06_articles.csv');
  const blocksData = readJson('blocks/articles.json') || [];
  const map = {};

  for (const row of rows) {
    if (!row.title) {
      log.skip('Bỏ qua dòng không có title');
      continue;
    }
    const slug = row.slug || row.title.toLowerCase().replace(/\s+/g, '-');
    const existing = await findExisting('articles', 'slug', slug);
    if (existing) {
      map[row.title] = existing.documentId;
      log.skip(`Đã tồn tại: ${row.title}`);
      continue;
    }

    const categoryIds = (row.category_name || '')
      .split('|')
      .map((n) => categoryMap[n.trim()])
      .filter(Boolean);

    // Tìm blocks content matching slug
    const articleBlocks = blocksData.find((b) => b.slug === slug);

    let imageId = null;
    if (row.image_url) {
      imageId = await resolveImage(row.image_url, `article-${slug}`);
    }

    const payload = {
      title: row.title,
      slug,
      description: row.description || '',
      locale: row.locale || DEFAULT_LOCALE,
      categories: categoryIds,
      publishedAt: row.published === 'true' ? new Date().toISOString() : null,
      seo: {
        metaTitle: row.title.slice(0, 60),
        metaDescription: (row.description || row.title).slice(0, 160),
      },
    };

    if (imageId) {
      payload.image = imageId;
    }

    // Gắn blocks content nếu có
    if (articleBlocks?.content) {
      payload.content = articleBlocks.content;
    }

    const created = await post('articles', payload);
    if (created) {
      map[row.title] = created.documentId;
      log.ok(created.id, row.title);
    }
  }
  return map;
};

// ─── SINGLE TYPE SEEDERS ──────────────────────────────────────────────────────

/**
 * Seed một Single Type cho cả 2 locales (en + vi).
 * File naming convention:
 *   - EN: single-types/{name}.json       (default locale)
 *   - VI: single-types/{name}.vi.json    (optional)
 */
const seedSingleTypeBilingual = async (apiName, fileName) => {
  // Seed EN (default locale)
  const enData = readJson(`single-types/${fileName}.json`);
  if (enData) {
    const result = await put(apiName, enData);
    if (result) log.ok(result.id || 'OK', `${apiName} [en] updated`);
  }

  // Seed VI locale
  const viData = readJson(`single-types/${fileName}.vi.json`);
  if (viData) {
    const result = await put(apiName, viData, 'vi');
    if (result) log.ok(result.id || 'OK', `${apiName} [vi] updated`);
  }
};

const seedGlobal = async () => {
  log.info('Seeding Global (Navbar + Footer)...');
  await seedSingleTypeBilingual('global', 'global');

  // Connect logo relation to navbar + footer
  log.info('Connecting Logo relation to Global (Navbar + Footer)...');
  const logo = await findExisting('logos', 'company', 'Nhà Atelier');
  if (logo) {
    const logoDocId = logo.documentId;
    const connectData = {
      navbar: {
        logo: { connect: [{ documentId: logoDocId }] },
      },
      footer: {
        logo: { connect: [{ documentId: logoDocId }] },
      },
    };
    const result = await put('global', connectData);
    if (result) log.ok(result.id || 'OK', `Logo connected: ${logoDocId}`);
  } else {
    log.skip('No Logo "Nhà Atelier" found — skipping logo connection');
  }
};

const seedBlogPage = async () => {
  log.info('Seeding Blog Page...');
  await seedSingleTypeBilingual('blog-page', 'blog-page');
};

const seedProductPage = async () => {
  log.info('Seeding Product Page...');
  await seedSingleTypeBilingual('product-page', 'product-page');
};

// ─── PAGE + DYNAMIC ZONE SEEDER ──────────────────────────────────────────────

/**
 * Inject relation IDs vào dynamic zones dựa trên locale.
 * Maps keys format: "locale:name" → documentId
 * planMap keys format: "name" → documentId (shared across locales)
 */
const injectDynamicZoneRefs = (pageData, planMap, testimonialMap, faqMap, locale = 'en') => {
  if (!pageData.dynamic_zone) return;

  // Helper: lọc map values theo locale prefix
  const filterByLocale = (map, loc) =>
    Object.entries(map)
      .filter(([key]) => key.startsWith(`${loc}:`))
      .map(([, val]) => val);

  for (const zone of pageData.dynamic_zone) {
    if (zone._plans_ref === 'INJECT_PLAN_IDS') {
      // Plans share documentId across locales → dùng tất cả
      zone.plans = Object.values(planMap);
      delete zone._plans_ref;
    }
    if (zone._testimonials_ref === 'INJECT_TESTIMONIAL_IDS') {
      zone.testimonials = filterByLocale(testimonialMap, locale);
      delete zone._testimonials_ref;
    }
    if (zone._faqs_ref === 'INJECT_FAQ_IDS') {
      zone.faqs = filterByLocale(faqMap, locale);
      delete zone._faqs_ref;
    }
  }
};

const seedPages = async (planMap, testimonialMap, faqMap) => {
  log.info('Seeding Pages (with Dynamic Zones)...');

  const pagesDir = path.join(SEED_DIR, 'pages');
  if (!fs.existsSync(pagesDir)) {
    log.skip('Thư mục pages/ không tồn tại');
    return;
  }

  const allFiles = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.json'));

  // Tách EN files (không có .vi.) và VI files (.vi.json)
  const enFiles = allFiles.filter((f) => !f.includes('.vi.'));
  const viFiles = allFiles.filter((f) => f.includes('.vi.'));

  // Seed EN pages trước (default locale)
  for (const file of enFiles) {
    const pageData = JSON.parse(
      fs.readFileSync(path.join(pagesDir, file), 'utf-8')
    );
    const slug = pageData.slug;
    if (!slug) {
      log.skip(`File ${file} không có slug`);
      continue;
    }

    const existing = await findExisting('pages', 'slug', slug);
    if (existing) {
      log.skip(`Page "${slug}" [en] đã tồn tại (ID:${existing.id})`);
      continue;
    }

    injectDynamicZoneRefs(pageData, planMap, testimonialMap, faqMap, 'en');
    delete pageData._comment;

    const created = await post('pages', {
      ...pageData,
      publishedAt: new Date().toISOString(),
    });
    if (created) log.ok(created.id, `Page: ${slug} [en]`);
  }

  // Seed VI pages — localization variants (dùng PUT lên cùng documentId)
  for (const file of viFiles) {
    const pageData = JSON.parse(
      fs.readFileSync(path.join(pagesDir, file), 'utf-8')
    );
    const slug = pageData.slug;
    if (!slug) {
      log.skip(`File ${file} không có slug`);
      continue;
    }

    // Tìm EN page đã tạo để lấy documentId
    const enPage = await findExisting('pages', 'slug', slug);
    if (!enPage) {
      log.skip(`EN Page "${slug}" chưa tồn tại — bỏ qua VI`);
      continue;
    }

    // Kiểm tra VI đã tồn tại chưa
    const viPage = await findExistingWithLocale('pages', 'slug', slug, 'vi');
    if (viPage) {
      log.skip(`Page "${slug}" [vi] đã tồn tại`);
      continue;
    }

    injectDynamicZoneRefs(pageData, planMap, testimonialMap, faqMap, 'vi');
    delete pageData._comment;
    delete pageData.locale;

    const result = await putDoc('pages', enPage.documentId, {
      ...pageData,
      publishedAt: new Date().toISOString(),
    }, 'vi');
    if (result) log.ok(result.id, `Page: ${slug} [vi] localized`);
  }
};

// ─── CLEANUP ──────────────────────────────────────────────────────────────────

const cleanAllData = async () => {
  log.section('🗑️  Cleanup Mode — Xóa toàn bộ data cũ...');
  // Xóa theo thứ tự ngược phụ thuộc (logos sau cùng vì không có FK dependency)
  const endpoints = [
    'pages',
    'articles',
    'plans',
    'products',
    'testimonials',
    'faqs',
    'categories',
    'logos',
  ];
  for (const ep of endpoints) {
    await cleanEndpoint(ep);
  }

  // Xóa toàn bộ Media Library files
  if (!FLAG_DRY_RUN) {
    try {
      const mediaRes = await fetch(
        `${STRAPI_URL}/api/upload/files?pagination[pageSize]=200`,
        { headers: { Authorization: `Bearer ${API_TOKEN}` } }
      );
      if (mediaRes.ok) {
        const mediaFiles = await mediaRes.json();
        if (mediaFiles.length > 0) {
          for (const file of mediaFiles) {
            await fetch(`${STRAPI_URL}/api/upload/files/${file.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${API_TOKEN}` },
            });
          }
          log.clean('media-files', mediaFiles.length);
        }
      }
    } catch {
      /* silent — media cleanup is best-effort */
    }
  }

  console.log('  ✅ Cleanup hoàn tất.\n');
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────

(async () => {
  log.section('AI Content Seeder v2 — Bắt đầu');
  console.log(`📡 Strapi URL : ${STRAPI_URL}`);
  console.log(`📁 Seed Dir   : ${SEED_DIR}`);
  if (FLAG_DRY_RUN) console.log('🔍 Mode       : DRY-RUN (không gửi API)');
  if (FLAG_CLEAN) console.log('🗑️  Mode       : CLEAN (xóa data cũ trước)');
  if (args.includes('--clean-only'))
    console.log('🗑️  Mode       : CLEAN ONLY (chỉ xóa data cũ)');

  if (!API_TOKEN) {
    console.error('\n❌ STRAPI_ADMIN_TOKEN chưa được cấu hình!');
    console.error(
      '   → Vào Strapi Admin > Settings > API Tokens > Create new token (Full access)'
    );
    console.error(
      '   → Thêm vào strapi/.env: STRAPI_ADMIN_TOKEN=your_token_here\n'
    );
    process.exit(1);
  }

  if (!FLAG_DRY_RUN) {
    try {
      const healthCheck = await fetch(`${STRAPI_URL}/_health`);
      if (!healthCheck.ok) throw new Error(`Status ${healthCheck.status}`);
      console.log('✅ Strapi đang chạy và phản hồi bình thường.\n');
    } catch (err) {
      console.error(`\n❌ Không thể kết nối đến Strapi tại ${STRAPI_URL}`);
      console.error(`   → Lỗi: ${err.message}`);
      console.error('   → Hãy chắc chắn Strapi đang chạy trước khi seed.\n');
      process.exit(1);
    }
  }

  // Cleanup nếu có flag
  if (FLAG_CLEAN || args.includes('--clean-only')) {
    await cleanAllData();
    if (args.includes('--clean-only')) {
      console.log('✅ Clean Only hoàn tất. Thoát script.\n');
      process.exit(0);
    }
  }

  // ── Phase 0: Logos (image required — phải seed trước) ───────────────────
  log.section('Phase 0: Seed Logos (Local Static / Remote URL)');
  await seedLogos();

  // ── Phase 1: Collection Types (CSV) ──────────────────────────────────────
  log.section('Phase 1: Seed Collection Types (CSV)');
  const categoryMap = await seedCategories();
  const productMap = await seedProducts(categoryMap);
  const planMap = await seedPlans(productMap);
  const faqMap = await seedFaqs();
  const testimonialMap = await seedTestimonials();
  const articleMap = await seedArticles(categoryMap);

  // ── Phase 2: Single Types (JSON) ─────────────────────────────────────────
  log.section('Phase 2: Seed Single Types (JSON)');
  await seedGlobal();
  await seedBlogPage();
  await seedProductPage();

  // ── Phase 3: Pages + Dynamic Zones (JSON) ────────────────────────────────
  log.section('Phase 3: Seed Pages + Dynamic Zones');
  await seedPages(planMap, testimonialMap, faqMap);

  console.log('\n' + '═'.repeat(60));
  console.log('🎉 Seeding hoàn tất!');
  console.log(`   Kiểm tra dữ liệu tại: ${STRAPI_URL}/admin`);
  console.log('═'.repeat(60) + '\n');
})();
