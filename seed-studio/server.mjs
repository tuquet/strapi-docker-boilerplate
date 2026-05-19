import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const PORT = 4000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // 1. Static file serving (UI)
  if (req.method === 'GET' && !req.url.startsWith('/api/')) {
    let filePath = path.join(__dirname, 'dist', req.url === '/' ? 'index.html' : req.url);
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
      if (error) {
        if(error.code == 'ENOENT') {
          res.writeHead(404);
          res.end('File not found');
        } else {
          res.writeHead(500);
          res.end('Server error: '+error.code);
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
    return;
  }

  // 2. API: SSE Stream for running seed script
  if (req.method === 'GET' && req.url.startsWith('/api/seed-stream')) {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const isClean = urlObj.searchParams.get('clean') === 'true';
    const isCleanOnly = urlObj.searchParams.get('clean-only') === 'true';

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const scriptPath = path.join(__dirname, 'seed-from-csv.mjs');
    const args = [scriptPath];
    if (isCleanOnly) {
      args.push('--clean-only');
    } else if (isClean) {
      args.push('--clean');
    }

    const token = urlObj.searchParams.get('token');
    const env = { ...process.env };
    if (token) env.STRAPI_ADMIN_TOKEN = token;

    const child = spawn('node', args, { cwd: path.join(__dirname), env });

    const sendEvent = (type, data) => {
      res.write(`event: ${type}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    child.stdout.on('data', (data) => {
      const text = data.toString('utf8');
      sendEvent('log', text);
    });

    child.stderr.on('data', (data) => {
      const text = data.toString('utf8');
      sendEvent('log', text); // Treat stderr as log too for visualization
    });

    child.on('close', (code) => {
      sendEvent('done', { code });
      res.end();
    });

    req.on('close', () => {
      child.kill();
    });
    return;
  }

  // 3. API: Submit on-demand article
  if (req.method === 'POST' && req.url === '/api/seed-article') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        let apiToken = API_TOKEN;
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
          apiToken = authHeader.split(' ')[1];
        }
        
        if (!apiToken) throw new Error("STRAPI_ADMIN_TOKEN is missing. Vui lòng nhập token trên UI hoặc trong .env");

        // Simple mapping to Strapi format
        const strapiPayload = {
          data: {
            title: payload.title,
            slug: payload.slug || payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            description: payload.description,
            locale: 'vi', // default
            content: [
              {
                __component: "blocks.rich-text",
                body: payload.content || ""
              }
            ],
            publishedAt: new Date().toISOString(),
            seo: {
              metaTitle: payload.title.slice(0, 60),
              metaDescription: payload.description.slice(0, 160)
            }
          }
        };

        const response = await fetch(`${STRAPI_URL}/api/articles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`
          },
          body: JSON.stringify(strapiPayload)
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error?.message || "Failed to create article in Strapi");
        }

        // Ghi thêm vào CSV để giữ liệu cứng
        const csvPath = path.join(__dirname, 'seed-data', '06_articles.csv');
        if (fs.existsSync(csvPath)) {
          const csvLine = `\n"${payload.title}","${strapiPayload.data.slug}","${payload.description}","Technology","${payload.imageUrl || ''}","vi",true`;
          fs.appendFileSync(csvPath, csvLine, 'utf8');
        }

        // Return success
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: data.data }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 4. API: List seed files
  if (req.method === 'GET' && req.url === '/api/seed-files') {
    const seedDataPath = path.join(__dirname, 'seed-data');
    
    // Function to recursively get files
    const getFiles = (dir) => {
      let results = [];
      if (!fs.existsSync(dir)) return results;
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(getFiles(fullPath));
        } else if (file.endsWith('.csv') || file.endsWith('.json')) {
          results.push(fullPath.replace(seedDataPath + path.sep, '').replace(/\\/g, '/'));
        }
      });
      return results;
    };
    
    try {
      const files = getFiles(seedDataPath);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, files }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // 5. API: Read seed file
  if (req.method === 'GET' && req.url.startsWith('/api/seed-file?path=')) {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const filePathParam = urlObj.searchParams.get('path');
    
    if (!filePathParam) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Path parameter is missing' }));
      return;
    }

    const fullPath = path.join(__dirname, 'seed-data', filePathParam);
    
    // Security check: ensure path is within seed-data
    if (!fullPath.startsWith(path.join(__dirname, 'seed-data'))) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Access denied' }));
      return;
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(content);
    } catch (err) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'File not found' }));
    }
    return;
  }

  // 6. API: Append row to CSV
  if (req.method === 'POST' && req.url === '/api/append-csv') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const filePathParam = payload.path;
        if (!filePathParam) throw new Error('Path is missing');

        const fullPath = path.join(__dirname, 'seed-data', filePathParam);
        if (!fullPath.startsWith(path.join(__dirname, 'seed-data'))) {
          throw new Error('Access denied');
        }

        if (!fs.existsSync(fullPath)) {
          throw new Error('File not found');
        }

        // Convert array to CSV line (basic format)
        const newRow = payload.row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
        fs.appendFileSync(fullPath, `\n${newRow}`, 'utf8');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Fallback
  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`\n🚀 LaunchPad Seed Studio is running at http://localhost:${PORT}\n`);
});
