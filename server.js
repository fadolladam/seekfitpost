require('dotenv').config({ path: '.env.local' });

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT = 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
};

// ── Minimal Vercel-compatible response mock ──────────────────────────────────
function makeRes(nodeRes) {
  let _status = 200;
  let _headers = { 'Access-Control-Allow-Origin': '*' };

  const res = {
    setHeader(k, v) { _headers[k] = v; return res; },
    status(code)    { _status = code; return res; },
    end()           { nodeRes.writeHead(_status, _headers); nodeRes.end(); },
    json(data) {
      _headers['Content-Type'] = 'application/json';
      nodeRes.writeHead(_status, _headers);
      nodeRes.end(JSON.stringify(data));
    },
  };
  return res;
}

// ── Request body parser ──────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { resolve({}); }
    });
  });
}

// ── Main server ──────────────────────────────────────────────────────────────
const server = http.createServer(async (req, nodeRes) => {
  const baseURL = `http://${req.headers.host || 'localhost'}`;
  const parsed = new URL(req.url, baseURL);
  const pathname = decodeURIComponent(parsed.pathname);

  // ── API routes ─────────────────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const name        = pathname.slice(5).split('/')[0]; // e.g. "fetch-feed"
    const handlerFile = path.join(__dirname, 'api', `${name}.js`);

    if (!fs.existsSync(handlerFile)) {
      nodeRes.writeHead(404, { 'Content-Type': 'application/json' });
      nodeRes.end(JSON.stringify({ error: `API route /api/${name} not found` }));
      return;
    }

    req.query = Object.fromEntries(parsed.searchParams.entries());
    req.body  = await readBody(req);

    const res = makeRes(nodeRes);

    try {
      // Clear cache so edits to api files take effect without restart
      delete require.cache[require.resolve(handlerFile)];
      const handler = require(handlerFile);
      await handler(req, res);
    } catch (err) {
      console.error(`[API ERROR] /api/${name}:`, err.message);
      nodeRes.writeHead(500, { 'Content-Type': 'application/json' });
      nodeRes.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── Static files (React App & Public Assets) ───────────────────────────────
  let clientDir = path.join(__dirname, 'client', 'dist');
  let filePath;
  
  if (pathname.startsWith('/public/')) {
    filePath = path.join(__dirname, pathname);
  } else {
    filePath = path.join(clientDir, pathname === '/' ? 'index.html' : pathname);
  }

  // If file exists, serve it
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext      = path.extname(filePath).toLowerCase();
    const mimeType = MIME[ext] || 'application/octet-stream';
    nodeRes.writeHead(200, { 'Content-Type': mimeType });
    fs.createReadStream(filePath).pipe(nodeRes);
  } else {
    // SPA Fallback: route everything else to index.html
    const fallbackPath = path.join(clientDir, 'index.html');
    if (fs.existsSync(fallbackPath)) {
      nodeRes.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(fallbackPath).pipe(nodeRes);
    } else {
      nodeRes.writeHead(404, { 'Content-Type': 'text/plain' });
      nodeRes.end('404 Not Found');
    }
  }
});

const { initDB } = require('./api/db');

initDB().then(() => {
  server.listen(PORT, () => {
    console.log('');
    console.log('  ✅  SeekFitJob AI Post Generator');
    console.log(`  🌐  Open: http://localhost:${PORT}`);
    console.log('  ⚙️   Settings: http://localhost:' + PORT + '/settings');
    console.log('  🛑  Stop: press Ctrl + C');
    console.log('');
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
