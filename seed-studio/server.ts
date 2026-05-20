import * as tar from 'tar-stream';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import dotenv from 'dotenv';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

// ─── Config ──────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_ADMIN_TOKEN;
const PORT = 4000;

// ─── Helpers ─────────────────────────────────────────────────────────

const SEED_DATA_DIR = path.join(__dirname, 'seed-data');

/** Strip ANSI escape codes from child-process output */
const stripAnsi = (str: string): string =>
  str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');

/** Recursively list all .csv / .json files relative to `dir` */
function getFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      results.push(...getFiles(fullPath));
    } else if (file.endsWith('.csv') || file.endsWith('.json')) {
      results.push(
        fullPath.replace(SEED_DATA_DIR + path.sep, '').replace(/\\/g, '/')
      );
    }
  }
  return results;
}

/** Ensure `filePath` stays inside the seed-data directory (path-traversal guard) */
function safeSeedPath(filePath: string): string | null {
  const resolved = path.join(SEED_DATA_DIR, filePath);
  if (!resolved.startsWith(SEED_DATA_DIR)) return null;
  return resolved;
}

// ─── Hono App ────────────────────────────────────────────────────────

const app = new Hono();

app.use('*', cors());

// ── API Routes ───────────────────────────────────────────────────────

/**
 * GET /api/seed-stream
 * SSE endpoint – spawns `node seed-from-csv.mjs` and streams stdout/stderr
 * Query params: ?clean=true | ?clean-only=true | ?token=<api-token>
 */
app.get('/api/seed-stream', (c) => {
  const isClean = c.req.query('clean') === 'true';
  const isCleanOnly = c.req.query('clean-only') === 'true';
  const token = c.req.query('token');

  return streamSSE(c, async (stream) => {
    const scriptPath = path.join(__dirname, 'seed-from-csv.mjs');
    const args = [scriptPath];
    if (isCleanOnly) args.push('--clean-only');
    else if (isClean) args.push('--clean');

    const env: NodeJS.ProcessEnv = { ...process.env };
    if (token) env.STRAPI_ADMIN_TOKEN = token;

    const child = spawn('node', args, { cwd: __dirname, env });

    const writeEvent = async (type: string, data: unknown) => {
      await stream.writeSSE({ event: type, data: JSON.stringify(data) });
    };

    child.stdout.on('data', (data: Buffer) => {
      writeEvent('log', stripAnsi(data.toString('utf8')));
    });

    child.stderr.on('data', (data: Buffer) => {
      writeEvent('log', stripAnsi(data.toString('utf8')));
    });

    await new Promise<void>((resolve) => {
      child.on('close', (code) => {
        writeEvent('done', { code });
        resolve();
      });
    });

    stream.onAbort(() => {
      child.kill();
    });
  });
});

/**
 * GET /api/restore-stream
 * SSE endpoint – restores the latest Strapi backup (.tar.gz) from strapi/data/
 * Query params: ?only=content,files,config
 */
app.get('/api/restore-stream', (c) => {
  const onlyStr = c.req.query('only');
  return streamSSE(c, async (stream) => {
    const writeEvent = async (type: string, data: unknown) => {
      await stream.writeSSE({ event: type, data: JSON.stringify(data) });
    };

    const dataDir = path.join(__dirname, '..', 'strapi', 'data');
    if (!fs.existsSync(dataDir)) {
      await writeEvent('log', 'Error: Thư mục strapi/data không tồn tại.');
      await writeEvent('done', { code: 1 });
      return;
    }

    const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.tar.gz'));
    if (files.length === 0) {
      await writeEvent(
        'log',
        'Error: Không tìm thấy file backup (.tar.gz) trong thư mục strapi/data.'
      );
      await writeEvent('done', { code: 1 });
      return;
    }

    const backupFile = files.sort().reverse()[0];
    await writeEvent('log', `> Tìm thấy file backup: ${backupFile}`);
    await writeEvent(
      'log',
      '> Đang chạy tiến trình khôi phục (Strapi import)...'
    );

    const importArgs = [
      'strapi',
      'import',
      '-f',
      `./data/${backupFile}`,
      '--force',
      '--verbose',
    ];
    if (onlyStr) {
      importArgs.push('--only', onlyStr);
    }

    const child = spawn('yarn', importArgs, {
      cwd: path.join(__dirname, '..', 'strapi'),
      env: { ...process.env, NO_COLOR: '1' },
      shell: true,
    });

    child.stdout.on('data', (data: Buffer) => {
      writeEvent('log', stripAnsi(data.toString('utf8')));
    });

    child.stderr.on('data', (data: Buffer) => {
      writeEvent('log', stripAnsi(data.toString('utf8')));
    });

    await new Promise<void>((resolve) => {
      child.on('close', (code) => {
        if (code === 0) {
          writeEvent('log', '> ✅ Hoàn tất khôi phục từ backup thành công!');
        } else {
          writeEvent('log', `> ❌ Quá trình khôi phục gặp lỗi (Code: ${code})`);
        }
        writeEvent('done', { code });
        resolve();
      });
    });

    stream.onAbort(() => {
      child.kill();
    });
  });
});

/**
 * GET /api/backup-preview
 * Parse the latest .tar.gz and count entities
 */
app.get('/api/backup-preview', async (c) => {
  try {
    const dataDir = path.join(__dirname, '..', 'strapi', 'data');
    if (!fs.existsSync(dataDir)) {
      return c.json({ error: 'Thư mục strapi/data không tồn tại.' }, 404);
    }

    const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.tar.gz'));
    if (files.length === 0) {
      return c.json({ error: 'Không tìm thấy file backup (.tar.gz)' }, 404);
    }

    const backupFile = files.sort().reverse()[0];
    const backupPath = path.join(dataDir, backupFile);

    const stats = {
      articles: { count: 0, items: [] as any[] },
      categories: { count: 0, items: [] as any[] },
      media: { count: 0, items: [] as any[] },
      users: { count: 0, items: [] as any[] },
      others: 0,
    };

    const extract = tar.extract();

    await new Promise<void>((resolve, reject) => {
      extract.on('entry', (header, stream, next) => {
        if (header.name === 'entities/entities_00001.jsonl') {
          const rl = readline.createInterface({
            input: stream,
            crlfDelay: Infinity,
          });

          rl.on('line', (line) => {
            if (!line.trim()) return;
            try {
              const obj = JSON.parse(line);
              if (obj.type === 'api::article.article') {
                stats.articles.count++;
                if (stats.articles.items.length < 200) {
                  stats.articles.items.push({
                    id: obj.id,
                    title: obj.data.title,
                    slug: obj.data.slug,
                  });
                }
              } else if (obj.type === 'api::category.category') {
                stats.categories.count++;
                if (stats.categories.items.length < 200) {
                  stats.categories.items.push({
                    id: obj.id,
                    title: obj.data.name,
                    slug: obj.data.slug,
                  });
                }
              } else if (obj.type === 'plugin::upload.file') {
                stats.media.count++;
                if (stats.media.items.length < 200) {
                  stats.media.items.push({
                    id: obj.id,
                    title: obj.data.name,
                    url: obj.data.url,
                  });
                }
              } else if (obj.type === 'plugin::users-permissions.user') {
                stats.users.count++;
                if (stats.users.items.length < 200) {
                  stats.users.items.push({
                    id: obj.id,
                    title: obj.data.username || obj.data.email,
                    email: obj.data.email,
                  });
                }
              } else {
                stats.others++;
              }
            } catch (e) {
              // ignore parse errors for a line
            }
          });

          rl.on('close', () => {
            next();
          });
        } else {
          stream.on('end', () => {
            next();
          });
          stream.resume(); // drain the stream
        }
      });

      extract.on('finish', () => {
        resolve();
      });

      extract.on('error', (err) => {
        reject(err);
      });

      fs.createReadStream(backupPath).pipe(zlib.createGunzip()).pipe(extract);
    });

    return c.json({
      success: true,
      file: backupFile,
      stats,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * POST /api/seed-article
 * Create a single article in Strapi + append to CSV
 */
app.post('/api/seed-article', async (c) => {
  try {
    const payload = await c.req.json();

    let apiToken = API_TOKEN;
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      apiToken = authHeader.split(' ')[1];
    }

    if (!apiToken) {
      return c.json(
        {
          success: false,
          error:
            'STRAPI_ADMIN_TOKEN is missing. Vui lòng nhập token trên UI hoặc trong .env',
        },
        401
      );
    }

    const slug =
      payload.slug || payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const strapiPayload = {
      data: {
        title: payload.title,
        slug,
        description: payload.description,
        locale: 'vi',
        content: [
          {
            __component: 'blocks.rich-text',
            body: payload.content || '',
          },
        ],
        publishedAt: new Date().toISOString(),
        seo: {
          metaTitle: payload.title.slice(0, 60),
          metaDescription: payload.description.slice(0, 160),
        },
      },
    };

    const response = await fetch(`${STRAPI_URL}/api/articles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(strapiPayload),
    });

    const data = (await response.json()) as {
      data?: unknown;
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(
        data.error?.message || 'Failed to create article in Strapi'
      );
    }

    // Append to CSV for persistence
    const csvPath = path.join(SEED_DATA_DIR, '06_articles.csv');
    if (fs.existsSync(csvPath)) {
      const csvLine = `\n"${payload.title}","${slug}","${payload.description}","Technology","${payload.imageUrl || ''}","vi",true`;
      fs.appendFileSync(csvPath, csvLine, 'utf8');
    }

    return c.json({ success: true, data: data.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * GET /api/seed-files
 * List all seed data files (.csv / .json)
 */
app.get('/api/seed-files', (c) => {
  try {
    const files = getFiles(SEED_DATA_DIR);
    return c.json({ success: true, files });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * GET /api/seed-file?path=<relative-path>
 * Read the content of a specific seed data file
 */
app.get('/api/seed-file', (c) => {
  const filePathParam = c.req.query('path');

  if (!filePathParam) {
    return c.json({ success: false, error: 'Path parameter is missing' }, 400);
  }

  const fullPath = safeSeedPath(filePathParam);
  if (!fullPath) {
    return c.json({ success: false, error: 'Access denied' }, 403);
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    return c.text(content);
  } catch {
    return c.json({ success: false, error: 'File not found' }, 404);
  }
});

/**
 * POST /api/append-csv
 * Append a new row to an existing CSV file
 */
app.post('/api/append-csv', async (c) => {
  try {
    const payload = await c.req.json();
    const filePathParam = payload.path as string | undefined;

    if (!filePathParam) {
      return c.json({ success: false, error: 'Path is missing' }, 400);
    }

    const fullPath = safeSeedPath(filePathParam);
    if (!fullPath) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    if (!fs.existsSync(fullPath)) {
      return c.json({ success: false, error: 'File not found' }, 404);
    }

    const newRow = (payload.row as string[])
      .map((val: string) => `"${String(val).replace(/"/g, '""')}"`)
      .join(',');
    fs.appendFileSync(fullPath, `\n${newRow}`, 'utf8');

    return c.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ success: false, error: message }, 400);
  }
});

// ── Sprint 2: Dashboard & Content APIs ──────────────────────────────

/**
 * GET /api/strapi-status
 * Health check endpoint – verifies that Strapi is reachable.
 * Query params: ?token=<api-token>
 */
app.get('/api/strapi-status', async (c) => {
  const token = c.req.query('token');
  const apiToken = token || API_TOKEN;

  try {
    // Try to reach Strapi's content-type-builder API for version info
    const headers: Record<string, string> = {};
    if (apiToken) headers['Authorization'] = `Bearer ${apiToken}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${STRAPI_URL}/api/content-type-builder/content-types`, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json() as { data?: unknown[] };
      return c.json({
        status: 'online',
        url: STRAPI_URL,
        contentTypes: Array.isArray(data.data) ? data.data.length : 0,
        timestamp: new Date().toISOString(),
      });
    }

    // If auth fails, try unauthenticated health check
    const healthRes = await fetch(`${STRAPI_URL}/_health`);
    return c.json({
      status: healthRes.ok ? 'online' : 'degraded',
      url: STRAPI_URL,
      contentTypes: 0,
      timestamp: new Date().toISOString(),
      note: 'Token may be invalid - limited info available',
    });
  } catch (err) {
    return c.json({
      status: 'offline',
      url: STRAPI_URL,
      error: err instanceof Error ? err.message : 'Connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/content-stats
 * Get counts for all content types.
 * Query params: ?token=<api-token>
 */
app.get('/api/content-stats', async (c) => {
  const token = c.req.query('token');
  const apiToken = token || API_TOKEN;

  if (!apiToken) {
    return c.json({ success: false, error: 'API token required' }, 401);
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiToken}`,
  };

  const contentTypes = [
    { key: 'articles', endpoint: '/api/articles' },
    { key: 'products', endpoint: '/api/products' },
    { key: 'categories', endpoint: '/api/categories' },
    { key: 'plans', endpoint: '/api/plans' },
    { key: 'faqs', endpoint: '/api/faqs' },
    { key: 'testimonials', endpoint: '/api/testimonials' },
    { key: 'logos', endpoint: '/api/logos' },
    { key: 'pages', endpoint: '/api/pages' },
  ];

  const stats: Record<string, number> = {};

  await Promise.all(
    contentTypes.map(async ({ key, endpoint }) => {
      try {
        const res = await fetch(
          `${STRAPI_URL}${endpoint}?pagination[pageSize]=1&pagination[withCount]=true`,
          { headers }
        );
        if (res.ok) {
          const data = await res.json() as { meta?: { pagination?: { total?: number } } };
          stats[key] = data.meta?.pagination?.total ?? 0;
        } else {
          stats[key] = -1; // Error
        }
      } catch {
        stats[key] = -1;
      }
    })
  );

  return c.json({ success: true, stats });
});

/**
 * GET /api/content/:type
 * Generic proxy to list any Strapi content type with pagination.
 * Query params: ?token=<api-token> & any Strapi query params
 */
app.get('/api/content/:type', async (c) => {
  const type = c.req.param('type');
  const token = c.req.query('token');
  const apiToken = token || API_TOKEN;

  // Get Authorization from header or query
  const authHeader = c.req.header('Authorization');
  const finalToken = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : apiToken;

  if (!finalToken) {
    return c.json({ success: false, error: 'API token required' }, 401);
  }

  // Forward all query params except 'token'
  const url = new URL(`${STRAPI_URL}/api/${type}`);
  const searchParams = new URL(c.req.url).searchParams;
  searchParams.forEach((value, key) => {
    if (key !== 'token') url.searchParams.set(key, value);
  });

  // Default pagination if not specified
  if (!url.searchParams.has('pagination[pageSize]')) {
    url.searchParams.set('pagination[pageSize]', '25');
    url.searchParams.set('pagination[withCount]', 'true');
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${finalToken}` },
    });

    const data = await res.json();
    if (!res.ok) {
      return c.json({ success: false, error: (data as any).error?.message || 'Strapi error' }, res.status);
    }

    return c.json({ success: true, ...data as object });
  } catch (err) {
    return c.json({ success: false, error: err instanceof Error ? err.message : 'Proxy error' }, 500);
  }
});

// ── Static file serving (Svelte production build) ────────────────────
app.use('*', serveStatic({ root: './dist' }));

// Fallback to index.html for SPA routing
app.get('*', (c) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf8');
    return c.html(html);
  }
  return c.notFound();
});

// ─── Start Server ────────────────────────────────────────────────────
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(
    `\n🚀 LaunchPad Seed Studio Backend API is running at http://localhost:${PORT}\n`
  );
});
