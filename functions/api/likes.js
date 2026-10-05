// 九十九散记 · 点赞接口(Pages Functions,绑定 D1 数据库)
//   POST /api/likes   body: { type: 'comment'|'quote', id: number }
//   每个 IP 对每个目标只能赞一次(主键去重),重复点赞返回当前计数

const ALLOWED_EXACT = ['https://jiushijiu.pages.dev', 'http://localhost:8899', 'null'];
const ALLOWED_SUFFIX = '.jiushijiu.pages.dev';
const SALT = 'jsj-2026-7f3a9c1e';
const TYPES = { comment: 1, quote: 1 };

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) },
  });
}

function originAllowed(request) {
  const origin = request.headers.get('Origin') || '';
  if (!origin) return '*';
  if (ALLOWED_EXACT.includes(origin)) return origin;
  if (origin === 'null') return origin;
  try {
    const u = new URL(origin);
    if (u.hostname === 'jiushijiu.pages.dev') return origin;
    if (u.hostname.endsWith(ALLOWED_SUFFIX)) return origin;
  } catch (e) { /* ignore */ }
  return '';
}

async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function handle(request, env) {
  const origin = originAllowed(request);
  if (!origin) return json({ error: 'origin not allowed' }, 403, '*');

  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400, origin); }
    const type = String(body.type || '');
    const id = Number(body.id);
    if (!TYPES[type]) return json({ error: 'bad type' }, 400, origin);
    if (!Number.isInteger(id) || id <= 0) return json({ error: 'bad id' }, 400, origin);

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const ipHash = await sha256Hex(SALT + ip);

    const inserted = await env.DB.prepare(
      'INSERT OR IGNORE INTO likes (target_type, target_id, ip_hash) VALUES (?1, ?2, ?3)'
    ).bind(type, id, ipHash).run();
    const already = !inserted.meta.changes;

    const count = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM likes WHERE target_type = ?1 AND target_id = ?2'
    ).bind(type, id).first('n');

    return json({ ok: true, count, already: already === true }, 200, origin);
  }

  return json({ error: 'not found' }, 404, origin);
}

export async function onRequestPost(ctx) { return handle(ctx.request, ctx.env); }
export async function onRequestOptions(ctx) {
  const origin = originAllowed(ctx.request);
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}
