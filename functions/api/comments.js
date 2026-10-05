// 九十九散记 · 评论接口(Pages Functions,绑定 D1 数据库)
//   GET    /api/comments?page=<pageId>
//   POST   /api/comments        body: { page, name, text }
//   DELETE /api/comments?id=<id>&key=<ADMIN_KEY>   (管理员删除)

const ALLOWED_EXACT = ['https://jiushijiu.pages.dev', 'http://localhost:8899', 'null'];
const ALLOWED_SUFFIX = '.jiushijiu.pages.dev';
const SALT = 'jsj-2026-7f3a9c1e';
const NAME_MAX = 20, TEXT_MAX = 500, PAGE_RE = /^[a-z0-9-]{1,80}$/;

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
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
  if (ALLOWED_EXACT.includes(origin)) return origin;
  if (origin === 'null') return origin; // 本地双击 index.html 打开
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

  const url = new URL(request.url);

  if (request.method === 'GET') {
    const page = url.searchParams.get('page') || '';
    if (!PAGE_RE.test(page)) return json({ error: 'bad page' }, 400, origin);
    const res = await env.DB.prepare(
      'SELECT id, name, text, created_at FROM comments WHERE page = ?1 ORDER BY id DESC LIMIT 200'
    ).bind(page).all();
    return json(res.results || [], 200, origin);
  }

  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400, origin); }
    const page = String(body.page || '');
    const name = String(body.name || '').trim() || '路人';
    const text = String(body.text || '').trim();
    if (!PAGE_RE.test(page)) return json({ error: 'bad page' }, 400, origin);
    if (!text) return json({ error: '内容不能为空' }, 400, origin);
    if (name.length > NAME_MAX) return json({ error: '昵称太长了' }, 400, origin);
    if (text.length > TEXT_MAX) return json({ error: '留言最多 ' + TEXT_MAX + ' 字' }, 400, origin);

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const ipHash = await sha256Hex(SALT + ip);

    // 同一 IP 十分钟内最多 3 条
    const cnt = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM comments WHERE ip_hash = ?1 AND created_at >= datetime('now', '-600 seconds')"
    ).bind(ipHash).first('n');
    if (cnt >= 3) return json({ error: '留言太频繁啦,休息一会儿再来' }, 429, origin);

    await env.DB.prepare(
      'INSERT INTO comments (page, name, text, ip_hash) VALUES (?1, ?2, ?3, ?4)'
    ).bind(page, name, text, ipHash).run();
    return json({ ok: true }, 200, origin);
  }

  if (request.method === 'DELETE') {
    const id = Number(url.searchParams.get('id'));
    const key = url.searchParams.get('key') || '';
    if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return json({ error: 'unauthorized' }, 403, origin);
    if (!Number.isInteger(id) || id <= 0) return json({ error: 'bad id' }, 400, origin);
    await env.DB.prepare('DELETE FROM comments WHERE id = ?1').bind(id).run();
    return json({ ok: true }, 200, origin);
  }

  return json({ error: 'not found' }, 404, origin);
}

export async function onRequestGet(ctx) { return handle(ctx.request, ctx.env); }
export async function onRequestPost(ctx) { return handle(ctx.request, ctx.env); }
export async function onRequestDelete(ctx) { return handle(ctx.request, ctx.env); }
export async function onRequestOptions(ctx) {
  const origin = originAllowed(ctx.request);
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}
