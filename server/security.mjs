import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import https from 'node:https';
import { isIP } from 'node:net';

export const digest = value => createHash('sha256').update(String(value)).digest('hex');
export const token = () => randomBytes(32).toString('base64url');
export const uid = prefix => `${prefix}_${randomBytes(12).toString('hex')}`;
export const now = () => new Date().toISOString();
export class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export const fail = (status, code, message) => { throw new ApiError(status, code, message); };
export function secretEqual(a, b) { return timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b))); }
export function string(value, label, max = 2000, required = false) {
  if (typeof value !== 'string') { if (required) fail(400, 'invalid_input', `请填写${label}。`); return ''; }
  const text = value.trim();
  if (text.length > max) fail(400, 'input_too_long', `${label}最多 ${max} 个字符。`);
  if (required && !text) fail(400, 'invalid_input', `请填写${label}。`);
  return text;
}
export function email(value) {
  const text = string(value, '邮箱', 254, true).toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(text) || /[\r\n]/.test(text)) fail(400, 'invalid_email', '请填写有效邮箱。');
  return text;
}

// Only global unicast destinations may be fetched. DNS answers are pinned to the
// request connection, closing the DNS rebinding gap between validation and fetch.
export function isPublicAddress(raw) {
  let value = raw.toLowerCase().replace(/^\[|\]$/g, '');
  if (isIP(value) === 6) { try { value = new URL(`https://[${value}]`).hostname.replace(/^\[|\]$/g, ''); } catch { return false; } }
  if (isIP(value) === 4) {
    const p = value.split('.').map(Number);
    if ([0, 10, 127].includes(p[0]) || p[0] >= 224) return false;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return false;
    if (p[0] === 169 && p[1] === 254 || p[0] === 172 && p[1] >= 16 && p[1] <= 31 || p[0] === 192 && p[1] === 168) return false;
    if (p[0] === 192 && [0, 2].includes(p[1]) || p[0] === 192 && p[1] === 88 && p[2] === 99 || p[0] === 198 && [18, 19, 51].includes(p[1]) || p[0] === 203 && p[1] === 0 && p[2] === 113) return false;
    return true;
  }
  if (isIP(value) === 6) {
    // Conservatively support global unicast 2000::/3 only. Denies mapped IPv4,
    // loopback, ULA, link-local, multicast, translation and metadata addresses.
    if (!/^[23][0-9a-f]{0,3}:/.test(value)) return false;
    const prefix = value.split(':');
    // 2001::/23 contains special-purpose protocols; deny it conservatively,
    // including compressed zeros and ORCHID subranges rather than one spelling.
    if (prefix[0] === '2001' && (Number.parseInt(prefix[1] || '0', 16) < 0x200 || prefix[1] === 'db8') || /^2002:/.test(value) || /^3fff:/.test(value)) return false;
    return true;
  }
  return false;
}

export async function readPublicJson(rawUrl, { lookupImpl = lookup, maxBytes = 256_000, timeout = 8000 } = {}) {
  let target;
  try { target = new URL(rawUrl); } catch { fail(400, 'invalid_url', '请输入完整个人岛 HTTPS 链接。'); }
  // Production imports are HTTPS only; internal test island is handled separately
  // without HTTP or arbitrary local-network access.
  if (target.protocol !== 'https:' || target.username || target.password || target.port && target.port !== '443') fail(400, 'unsafe_url', '外部岛链接须为 HTTPS，且不能含账号或非标准端口。');
  for (let redirects = 0; redirects <= 2; redirects++) {
    const hostname = target.hostname.replace(/^\[|\]$/g, '');
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) fail(400, 'unsafe_url', '不能读取本机或内网链接。');
    const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await lookupImpl(hostname, { all: true, verbatim: true }).catch(() => fail(400, 'unreachable_url', '无法解析该岛链接。'));
    if (!addresses.length || addresses.some(item => !isPublicAddress(item.address))) fail(400, 'unsafe_url', '该链接解析到本机、内网或保留地址。');
    const pinned = addresses[0];
    const response = await new Promise((resolve, reject) => {
      const request = https.get(target, {
        agent: false,
        lookup: (_host, options, callback) => options?.all ? callback(null, [pinned]) : callback(null, pinned.address, pinned.family),
        headers: { Accept: 'application/json', 'User-Agent': 'Superdimension-IdentityImporter/0.3' },
        timeout,
      }, res => {
        let length = 0; const chunks = [];
        if (Number(res.headers['content-length'] || 0) > maxBytes) { res.destroy(); reject(new ApiError(400, 'identity_too_large', '身份包超过 256 KB。')); return; }
        res.on('data', chunk => { length += chunk.length; if (length > maxBytes) { res.destroy(); reject(new ApiError(400, 'identity_too_large', '身份包超过 256 KB。')); } else chunks.push(chunk); });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString('utf8') }));
        res.on('error', reject);
      });
      request.on('timeout', () => request.destroy(new ApiError(400, 'identity_timeout', '读取身份包超时。')));
      request.on('error', reject);
    }).catch(error => { if (error instanceof ApiError) throw error; fail(400, 'unreachable_url', '无法安全读取该岛身份包。'); });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirects === 2 || !response.headers.location) fail(400, 'too_many_redirects', '该岛链接重定向过多。');
      target = new URL(response.headers.location, target);
      if (target.protocol !== 'https:' || target.username || target.password || target.port && target.port !== '443') fail(400, 'unsafe_redirect', '重定向到不安全链接。');
      continue;
    }
    if (response.status !== 200) fail(400, 'incompatible_island', '该链接未提供可读取的公开身份包。');
    if (!/application\/(?:[a-z.+-]*\+)?json/i.test(response.headers['content-type'] || '')) fail(400, 'incompatible_island', '该链接没有兼容的 JSON 身份包。');
    try { return { value: JSON.parse(response.text), url: target.href }; } catch { fail(400, 'invalid_identity', '身份包 JSON 无法解析。'); }
  }
}

export function profileUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { fail(400, 'invalid_url', '请输入完整个人岛链接。'); }
  url.hash = ''; url.search = '';
  if (!url.pathname.endsWith('/agent/profile.json')) url.pathname = `${url.pathname.replace(/\/$/, '')}/agent/profile.json`;
  return url.href;
}

export async function readBody(req, limit = 240_000) {
  if (!/application\/json/i.test(req.headers['content-type'] || '')) fail(415, 'json_required', '接口仅接收 JSON。');
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) fail(413, 'body_too_large', '提交内容过大，请减少文件和文字。');
    chunks.push(chunk);
  }
  try { const result = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error(); return result; }
  catch { fail(400, 'invalid_json', '提交内容不是有效 JSON 对象。'); }
}
