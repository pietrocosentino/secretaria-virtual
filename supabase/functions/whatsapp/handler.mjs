import { Buffer } from 'node:buffer';
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
  const required = ['META_VERIFY_TOKEN', 'META_APP_SECRET', 'META_ACCESS_TOKEN', 'META_PHONE_NUMBER_ID', 'META_GRAPH_VERSION', 'WHATSAPP_ALLOWED_NUMBERS', 'ADMIN_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  if (required.some(key => !env[key]?.trim())) return reply(503, 'Configuration pending');
  const allowedNumbers = env.WHATSAPP_ALLOWED_NUMBERS.split(',').map(number => number.trim());
  if (allowedNumbers.some(number => !/^\d{7,15}$/.test(number))) return reply(503, 'Configuration pending');
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
