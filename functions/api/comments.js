// 九十九散记 · 评论接口(Pages Functions,绑定 D1 数据库)
//   GET    /api/comments?page=<pageId>
//   POST   /api/comments        body: { page, name, text }
//   DELETE /api/comments?id=<id>&key=<ADMIN_KEY>   (管理员删除)
//
// 划线评论在同域的 /api/quotes,见 functions/api/quotes.js。

import {
  createHandlers, corsHeaders, originAllowed, json, PAGE_RE,
  validateComment, ipHashOf, adminAuthorized, deleteIdOf, readJson,
  countRecent, RATE_LIMIT,
} from '../_lib/api.js';

const TABLE = 'comments';
const LIST_LIMIT = 200;

async function handle(request, env, url) {
  const origin = originAllowed(request);
  if (!origin) return json({ error: 'origin not allowed' }, 403, '*');

  if (request.method === 'GET') {
    const page = url.searchParams.get('page') || '';
    if (!PAGE_RE.test(page)) return json({ error: 'bad page' }, 400, origin);
    const res = await env.DB.prepare(
`SELECT c.id, c.name, c.text, c.created_at, (SELECT COUNT(*) FROM likes l WHERE l.target_type = 'comment' AND l.target_id = c.id) AS likes FROM ${TABLE} c WHERE c.page = ?1 ORDER BY c.id DESC LIMIT ${LIST_LIMIT}`
    ).bind(page).all();
    return json(res.results || [], 200, origin);
  }

  if (request.method === 'POST') {
    const body = await readJson(request);
    if (!body) return json({ error: 'bad json' }, 400, origin);

    const page = String(body.page || '');
    const name = String(body.name || '').trim() || '路人';
    const text = String(body.text || '').trim();

    const bad = validateComment({ page, name, text }, '留言');
    if (bad) return json(bad, 400, origin);

    const ipHash = await ipHashOf(request);

    // 同一 IP 十分钟内最多 3 条
    const cnt = await countRecent(env.DB, TABLE, ipHash);
    if (cnt >= RATE_LIMIT) return json({ error: '留言太频繁啦,休息一会儿再来' }, 429, origin);

    await env.DB.prepare(
      `INSERT INTO ${TABLE} (page, name, text, ip_hash) VALUES (?1, ?2, ?3, ?4)`
    ).bind(page, name, text, ipHash).run();
    return json({ ok: true }, 200, origin);
  }

  if (request.method === 'DELETE') {
    if (!adminAuthorized(request, env)) return json({ error: 'unauthorized' }, 403, origin);
    const id = deleteIdOf(request);
    if (!id) return json({ error: 'bad id' }, 400, origin);
    await env.DB.prepare(`DELETE FROM ${TABLE} WHERE id = ?1`).bind(id).run();
    return json({ ok: true }, 200, origin);
  }

  return json({ error: 'not found' }, 404, origin);
}

export const { onRequestGet, onRequestPost, onRequestDelete, onRequestOptions } = createHandlers(handle);