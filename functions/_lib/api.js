// 九十九散记 · API 公共模块
//   供 functions/api/comments.js 与 functions/api/quotes.js 复用。
//   目录名以 _ 开头,Cloudflare Pages 不会把它当成路由。

const ALLOWED_EXACT = ['https://jiushijiu.pages.dev', 'http://localhost:8899', 'null'];
const ALLOWED_SUFFIX = '.jiushijiu.pages.dev';
const SALT = 'jsj-2026-7f3a9c1e';

export const NAME_MAX = 20;
export const TEXT_MAX = 500;
export const QUOTE_MAX = 150;
export const PARA_MAX = 2000;
export const PAGE_RE = /^[a-z0-9-]{1,80}$/;
export const RATE_WINDOW_SECONDS = 600; // 同一 IP 十分钟窗口
export const RATE_LIMIT = 3;           // 窗口内最多条数

export function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) },
  });
}

export function originAllowed(request) {
  const origin = request.headers.get('Origin') || '';
  if (!origin) return '*';                 // 同源 GET 不带 Origin 头,直接放行
  if (ALLOWED_EXACT.includes(origin)) return origin;
  if (origin === 'null') return origin;    // 本地双击 index.html 打开
  try {
    const u = new URL(origin);
    if (u.hostname === 'jiushijiu.pages.dev') return origin;
    if (u.hostname.endsWith(ALLOWED_SUFFIX)) return origin;
  } catch (e) { /* ignore */ }
  return '';
}

export async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** IP 只以加盐哈希存储,不落明文 */
export function ipHashOf(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  return sha256Hex(SALT + ip);
}

/** 校验管理员密钥;未配置 ADMIN_KEY 一律拒绝 */
export function adminAuthorized(request, env) {
  const key = request.headers.get('X-Admin-Key')
    || new URL(request.url).searchParams.get('key')
    || '';
  return !!env.ADMIN_KEY && key === env.ADMIN_KEY;
}

/** 解析待删除的留言 id,非法返回 0 */
export function deleteIdOf(request) {
  const id = Number(new URL(request.url).searchParams.get('id'));
  return Number.isInteger(id) && id > 0 ? id : 0;
}

/** 解析 JSON body,失败返回 null */
export async function readJson(request) {
  try { return await request.json(); } catch (e) { return null; }
}

/**
 * 校验评论公共字段:name / text / page。
 * noun 为提示文案中的名词(留言 / 评论),两个接口各自保持原有措辞。
 * 返回 { } 表示通过,否则返回可直接作为响应体的 { error }。
 */
export function validateComment(fields, noun) {
  const { page, name, text } = fields;
  if (!PAGE_RE.test(page)) return { error: 'bad page' };
  if (!text) return { error: '内容不能为空' };
  if (name.length > NAME_MAX) return { error: '昵称太长了' };
  if (text.length > TEXT_MAX) return { error: noun + '最多 ' + TEXT_MAX + ' 字' };
  return null;
}

/** 校验划线评论的 para_idx / quote 字段 */
export function validateQuote(paraIdx, quote) {
  if (!Number.isInteger(paraIdx) || paraIdx < 0 || paraIdx > PARA_MAX) return { error: 'bad para' };
  if (quote.length < 2 || quote.length > QUOTE_MAX) return { error: '引用原句需在 2-150 字之间' };
  return null;
}

/**
 * 同一 IP 在时间窗口内的留言数。表格名为受控常量,不来自用户输入。
 */
export function countRecent(db, table, ipHash) {
  return db.prepare(
    `SELECT COUNT(*) AS n FROM ${table}
     WHERE ip_hash = ?1 AND created_at >= datetime('now', '-${RATE_WINDOW_SECONDS} seconds')`
  ).bind(ipHash).first('n');
}

/**
 * 生成 Pages Functions 的 onRequest* 导出。
 * fetchHandler(request, env, url) 由各接口自己实现。
 */
export function createHandlers(fetchHandler) {
  const run = (ctx) => fetchHandler(ctx.request, ctx.env, new URL(ctx.request.url));

  return {
    onRequestGet: (ctx) => run(ctx),
    onRequestPost: (ctx) => run(ctx),
    onRequestDelete: (ctx) => run(ctx),
    onRequestOptions: (ctx) => {
      const origin = originAllowed(ctx.request);
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    },
  };
}