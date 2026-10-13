import { Buffer } from 'node:buffer';
import { validSignature, extractMessages } from './shared/meta.mjs';
import { timingSafeEqual } from 'node:crypto';
import { Readable } from 'node:stream';
import { createHandler } from './shared/handler.mjs';
import { MessageService } from './shared/handle-message.mjs';
import { MetaTransport } from './shared/meta.mjs';
import { SupabaseStore } from './shared/store.mjs';
import { VERSION, respond } from './shared/conversation.mjs';
import { homologationHtml } from './homologacao.mjs';
export async function handleRequest(request, env, dependencies = {}) {
  env = { ...env };
  const aliases = { META_VERIFY_TOKEN: 'WHATSAPP_VERIFY_TOKEN', META_APP_SECRET: 'WHATSAPP_APP_SECRET', META_ACCESS_TOKEN: 'WHATSAPP_ACCESS_TOKEN', META_PHONE_NUMBER_ID: 'WHATSAPP_PHONE_NUMBER_ID', META_GRAPH_VERSION: 'GRAPH_API_VERSION' };
  for (const [name, alias] of Object.entries(aliases)) env[name] = env[name]?.trim() || env[alias]?.trim();
  const reply = (status, body) => new Response(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Bot-Version': VERSION } });
  const url = new URL(request.url);
  const prefix = url.pathname.startsWith('/functions/v1/whatsapp') ? '/functions/v1/whatsapp' : '/whatsapp';
  let route = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) || '/' : url.pathname;
  if (route === '/webhook') route = '/webhooks/whatsapp';
  // Homologação isolada: não instancia banco, transporte nem usa credenciais.
  if (route === '/homologacao' && request.method === 'GET') return new Response(homologationHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Bot-Version': VERSION, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'" } });
  if (route === '/homologacao/simular' && request.method === 'OPTIONS') return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
  if (route === '/homologacao/simular' && request.method === 'POST') {
    const simReply = (status, body) => new Response(body,{status,headers:{'Content-Type':'text/plain','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});
    try {
      const reader = request.body?.getReader(); let size = 0; const chunks = [];
      if (!reader) return simReply(400, 'Invalid simulation');
      while (true) { const {value,done}=await reader.read(); if(done)break; size+=value.length; if(size>256*1024){await reader.cancel();return simReply(413,'Simulation too large');}chunks.push(Buffer.from(value)); }
      const body=JSON.parse(Buffer.concat(chunks).toString());
      if (!body || typeof body.state !== 'object' || !body.state || Array.isArray(body.state) || typeof body.text !== 'string' || body.text.length>4000 || !Number.isFinite(body.now) || (body.media && (body.media.type!=='video' || typeof body.media.id!=='string'))) return simReply(400,'Invalid simulation');
      const result=respond(body.state,body.text,{now:body.now,media:body.media});
      return new Response(JSON.stringify({...result,version:VERSION}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});
    } catch { return simReply(400,'Invalid simulation'); }
  }

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
  if (request.method === 'POST' && (route === '/' || route === '/webhooks/whatsapp')) {
    const signatureValid = validSignature(raw, request.headers.get('x-hub-signature-256'), env.META_APP_SECRET);
    const diagnostic = { event: 'webhook_received', signatureValid };
    if (signatureValid) {
      try {
        const payload = JSON.parse(raw.toString());
        const values = (payload.entry || []).flatMap(e => (e.changes || []).map(c => c.value));
        const messages = extractMessages(payload, env.META_PHONE_NUMBER_ID);
        Object.assign(diagnostic, {
          incomingMessages: values.reduce((n,v) => n + (v?.messages?.length || 0), 0),
          phoneMatches: values.some(v => v?.metadata?.phone_number_id === env.META_PHONE_NUMBER_ID),
          textMessages: messages.filter(m => !m.media).length,
          mediaMessages: messages.filter(m => m.media).length,
          allowedMessages: messages.filter(m => allowedNumbers.includes(m.from)).length,
          timelyMessages: messages.filter(m => Number.isFinite(m.timestamp) && Date.now()-m.timestamp <= 23*3600000 && m.timestamp <= Date.now()+300000).length
        });
      } catch { diagnostic.invalidJson = true; }
    }
    console.info(JSON.stringify(diagnostic));
  }
  const diagnosticFetch = async (target, options) => {
    const provider = new URL(target).hostname === 'graph.facebook.com' ? 'meta' : 'database';
    try {
      const response = await fetch(target, options);
      console.info(JSON.stringify({ event: 'provider_response', provider, status: response.status }));
      return response;
    } catch {
      console.info(JSON.stringify({ event: 'provider_network_failure', provider }));
      throw Error('Provider unavailable');
    }
  };
  try {
    const store = dependencies.store || new SupabaseStore({ url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl: diagnosticFetch });
    const transport = dependencies.transport || new MetaTransport({ token: env.META_ACCESS_TOKEN, phoneId: env.META_PHONE_NUMBER_ID, version: env.META_GRAPH_VERSION, fetchImpl: diagnosticFetch });
    const service = new MessageService({ store, transport, allowedNumbers });
    const handler = createHandler({ service, verifyToken: env.META_VERIFY_TOKEN, appSecret: env.META_APP_SECRET, phoneId: env.META_PHONE_NUMBER_ID, adminToken: env.ADMIN_TOKEN });
    const req = Readable.from(raw.length ? [raw] : []);
    req.url = (route === '/' ? '/webhooks/whatsapp' : route) + url.search;
    req.method = request.method; req.headers = Object.fromEntries(request.headers);
    let status = 200, headers = {}, body = '';
    await handler(req, { writeHead(code, values) { status = code; headers = values; }, end(value = '') { body = value; } });
    console.info(JSON.stringify({event:'request_completed', method:request.method, status}));
    return new Response(body, { status, headers: { ...headers, 'X-Bot-Version': VERSION } });
  } catch { return reply(503, 'Request failed'); }
}

