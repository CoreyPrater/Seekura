import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { dirname, fromFileUrl, join } from 'https://deno.land/std@0.177.0/path/mod.ts';
import { generateImage } from './image.ts';
import { serveAsset } from './assets.ts';
import { serveFrontend } from './frontend.ts';
import { handleChat } from './chat.ts';

/* ----------------------------------
   PATH SETUP
----------------------------------- */

const __dirname = dirname(fromFileUrl(import.meta.url));
const FRONTEND_ROOT = join(__dirname, '../frontend');
const ASSETS_ROOT = join(FRONTEND_ROOT, 'assets');
const CHAT_ASSETS_ROOT = join(FRONTEND_ROOT, 'chat/assets');

const PROXY_TARGET = 'http://127.0.0.1:5005';

console.log('======================================');
console.log('Seekura gateway starting');
console.log('Listening on http://localhost:8000/');
console.log('Proxy target:', PROXY_TARGET);
console.log('======================================');

/* ----------------------------------
   LOG HELPERS
----------------------------------- */

function requestId() {
  return crypto.randomUUID().slice(0, 8);
}

function log(id: string, msg: string, obj?: unknown) {
  const prefix = `[Gateway ${id}]`;
  if (obj !== undefined) {
    console.log(prefix, msg);
    console.dir(obj, { depth: null });
  } else {
    console.log(prefix, msg);
  }
}

function logTime(id: string, label: string, start: number) {
  log(id, `[TIMING] ${label}: ${Date.now() - start}ms`);
}

/* ----------------------------------
   SERVER
----------------------------------- */

serve(async (req) => {
  const id = requestId();
  const startTotal = Date.now();

  const url = new URL(req.url);
  const path = url.pathname;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  log(id, 'Incoming request', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers),
  });

  if (req.method === 'OPTIONS') {
    log(id, 'OPTIONS preflight');
    return new Response(null, { status: 204, headers });
  }

  try {
    /* ----------------------------------
       1. /chat
    ----------------------------------- */

    if (path === '/chat' && req.method === 'POST') {
      log(id, 'Handling /chat');
      const t0 = Date.now();

      const body = await req.json().catch(err => {
        log(id, '❌ Failed to parse JSON body', err);
        return null;
      });

      if (!body) {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
      }

      log(id, 'Chat request body', body);

      const { character_id, session_id, messages } = body;

      if (!messages?.length) {
        log(id, '❌ Missing messages');
        return new Response(JSON.stringify({ error: 'Missing messages' }), { status: 400, headers });
      }

      if (!character_id) {
        log(id, '❌ Missing character_id');
        return new Response(JSON.stringify({ error: 'Missing character_id' }), { status: 400, headers });
      }

      log(id, 'Calling handleChat()', {
        character_id,
        session_id,
        messageCount: messages.length,
      });

      const reply = await handleChat(character_id, session_id, messages);

      log(id, 'Chat reply generated', {
        length: reply?.length,
        preview: reply?.slice(0, 200),
      });

      logTime(id, '/chat total', t0);
      return new Response(JSON.stringify({ reply }), { headers });
    }

    /* ----------------------------------
       2. Image generation
    ----------------------------------- */

    if (req.method === 'POST' && path.startsWith('/generate/')) {
      const t0 = Date.now();
      const styleKey = path.split('/').pop()!;

      log(id, 'Image generation request', { styleKey });

      const body = await req.json().catch(() => ({}));
      log(id, 'Image request body', body);

      const data = await generateImage(styleKey, body);

      log(id, 'Image generation complete');
      logTime(id, 'Image generation', t0);

      return new Response(JSON.stringify(data), { headers });
    }

    /* ----------------------------------
       3. Proxy to Ollama backend
    ----------------------------------- */

    if (path.startsWith('/characters') || path.startsWith('/sessions')) {
      const t0 = Date.now();
      const targetUrl = `${PROXY_TARGET}${path}${url.search}`;

      log(id, 'Proxying request', {
        targetUrl,
        method: req.method,
      });

      const body =
        req.method !== 'GET' && req.method !== 'OPTIONS'
          ? await req.arrayBuffer()
          : undefined;

      const proxyRes = await fetch(targetUrl, {
        method: req.method,
        headers: req.headers,
        body,
      });

      const forwardHeaders: Record<string, string> = {
        'Access-Control-Allow-Origin': '*',
      };

      proxyRes.headers.forEach((value, key) => {
        forwardHeaders[key] = value;
      });

      const data = await proxyRes.arrayBuffer();

      log(id, 'Proxy response', {
        status: proxyRes.status,
        bytes: data.byteLength,
      });

      logTime(id, 'Proxy request', t0);
      return new Response(data, { status: proxyRes.status, headers: forwardHeaders });
    }

    /* ----------------------------------
       4. Assets
    ----------------------------------- */

    if (path.startsWith('/assets/')) {
      log(id, 'Serving asset', path);
      return serveAsset(req, ASSETS_ROOT, '/assets/');
    }

    if (path.startsWith('/chat/assets/')) {
      log(id, 'Serving chat asset', path);
      return serveAsset(req, CHAT_ASSETS_ROOT, '/chat/assets/');
    }

    /* ----------------------------------
       5. Frontend
    ----------------------------------- */

    if (req.method === 'GET') {
      log(id, 'Serving frontend', path);
      return serveFrontend(req, FRONTEND_ROOT);
    }

    /* ----------------------------------
       Fallback
    ----------------------------------- */

    log(id, '⚠️ 404 Not Found', path);
    return new Response('Not found', { status: 404, headers });

  } catch (err) {
    log(id, '🔥 Unhandled gateway error', {
      message: err?.message,
      stack: err?.stack,
    });

    return new Response(
      JSON.stringify({ error: 'Gateway error', detail: String(err) }),
      { status: 500, headers }
    );
  } finally {
    logTime(id, 'TOTAL request', startTotal);
  }
}, { port: 8000 });
