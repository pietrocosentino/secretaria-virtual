import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';
import { Readable } from 'node:stream';
import { createHandler } from './shared/handler.mjs';
import { MessageService } from './shared/handle-message.mjs';
import { MetaTransport } from './shared/meta.mjs';
import { SupabaseStore } from './shared/store.mjs';
export async function handleRequest(request, env, dependencies = {}) {
  const reply = (status, body) => new Response(body, { status, headers: { 'Cache-Control': 'no-store' } });
  const url = new URL(request.url);
  const prefix = url.pathname.startsWith('/functions/v1/whatsapp') ? '/functions/v1/whatsapp' : '/whatsapp';
  const route = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) || '/' : url.pathname;
  if (route === '/health' && request.method === 'GET') return reply(200, 'ok');
  if ((route === '/' || route === '/webhooks/whatsapp') && request.method === 'GET') {
    const actual = Buffer.from(url.searchParams.get('hub.verify_token') || '');
    const expected = Buffer.from(env.META_VERIFY_TOKEN || '');
    const tokenMatches = expected.length > 0 && actual.length === expected.length && timingSafeEqual(actual, expected);
    const modeValid = url.searchParams.get('hub.mode') === 'subscribe';
    const challengePresent = url.searchParams.has('hub.challenge');
    // Apenas resultados booleanos; nunca registrar URL/query ou valores secretos.
    console.info(JSON.stringify({event:'webhook_verification', modeValid, challengePresent, tokenMatches, tokenConfigured:expected.length > 0}));
    return reply(tokenMatches && modeValid && challengePresent ? 200 : 403,
      tokenMatches && modeValid && challengePresent ? url.searchParams.get('hub.challenge') : 'Verification rejected');
  }

  const required = ['META_VERIFY_TOKEN', 'META_APP_SECRET', 'META_ACCESS_TOKEN', 'META_PHONE_NUMBER_ID', 'META_GRAPH_VERSION', 'WHATSAPP_ALLOWED_NUMBERS', 'ADMIN_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter(key => !env[key]?.trim());
  if (missing.length) return reply(503, 'Configuration pending: missing ' + missing.join(', '));
  const allowedNumbers = env.WHATSAPP_ALLOWED_NUMBERS.split(',').map(number => number.trim());
  if (allowedNumbers.some(number => !/^\d{7,15}$/.test(number))) return reply(503, 'Configuration pending: invalid WHATSAPP_ALLOWED_NUMBERS');
  let raw = Buffer.alloc(0);
  if (request.body) {
    const reader = request.body.getReader(); const chunks = []; let length = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.length;
      if (length > 1024 * 1024) { await reader.cancel(); return reply(413, 'Body too large'); }
      chunks.push(Buffer.from(value));
    }
    raw = Buffer.concat(chunks);
  }
  try {
    const store = dependencies.store || new SupabaseStore({ url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_ROLE_KEY });
    const transport = dependencies.transport || new MetaTransport({ token: env.META_ACCESS_TOKEN, phoneId: env.META_PHONE_NUMBER_ID, version: env.META_GRAPH_VERSION });
    const service = new MessageService({ store, transport, allowedNumbers });
    const handler = createHandler({ service, verifyToken: env.META_VERIFY_TOKEN, appSecret: env.META_APP_SECRET, phoneId: env.META_PHONE_NUMBER_ID, adminToken: env.ADMIN_TOKEN });
    const req = Readable.from(raw.length ? [raw] : []);
    req.url = (route === '/' ? '/webhooks/whatsapp' : route) + url.search;
    req.method = request.method; req.headers = Object.fromEntries(request.headers);
    let status = 200, headers = {}, body = '';
    await handler(req, { writeHead(code, values) { status = code; headers = values; }, end(value = '') { body = value; } });
    return new Response(body, { status, headers });
  } catch { return reply(503, 'Request failed'); }
}
