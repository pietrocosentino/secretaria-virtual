import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';
import { validSignature, extractMessages } from './meta.mjs';
function validPayload(payload) {
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  if (!object(payload) || (payload.entry !== undefined && !Array.isArray(payload.entry))) return false;
  return (payload.entry || []).every(entry => object(entry) && (entry.changes === undefined || (Array.isArray(entry.changes) && entry.changes.every(change => object(change) && object(change.value) && (change.value.messages === undefined || (Array.isArray(change.value.messages) && change.value.messages.every(object)))))));
}
function equalSecret(actual, expected) {
  if (!expected || typeof actual !== 'string') return false;
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
async function readBody(request) {
  const chunks = []; let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) { const error = Error('Body too large'); error.status = 413; throw error; }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
function createHandler({ service, verifyToken, appSecret, phoneId, adminToken }) {
  return async (req, res) => {
    const send = (status, body = '') => { res.writeHead(status, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }); res.end(body); };
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/health' && req.method === 'GET') return send(200, 'ok');
      if (url.pathname === '/admin/requests' && req.method === 'GET') {
        if (!adminToken || !equalSecret(req.headers.authorization, `Bearer ${adminToken}`)) return send(401);
        const result = await service.listRequests();
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        return res.end(JSON.stringify(result));
      }
      if (url.pathname === '/admin/owner' && req.method === 'POST') {
        if (!equalSecret(req.headers.authorization, `Bearer ${adminToken || ''}`) || !adminToken) return send(401);
        const body = JSON.parse((await readBody(req)).toString());
        if (!/^\d{7,15}$/.test(body.contact || '') || !['bot', 'human'].includes(body.owner)) return send(400);
        await service.setOwner(body.contact, body.owner); return send(200, 'ok');
      }
      if (url.pathname === '/admin/action' && req.method === 'POST') {
        if (!adminToken || !equalSecret(req.headers.authorization, `Bearer ${adminToken}`)) return send(401);
        const body = JSON.parse((await readBody(req)).toString());
        await service.adminAction(body); return send(200, 'ok');
      }
      if (url.pathname === '/admin/tick' && req.method === 'POST') {
        if (!adminToken || !equalSecret(req.headers.authorization, `Bearer ${adminToken}`)) return send(401);
        await service.tick(); return send(200, 'ok');
      }
      if (url.pathname !== '/webhooks/whatsapp') return send(404);
      if (req.method === 'GET') {
        if (url.searchParams.get('hub.mode') !== 'subscribe' || !equalSecret(url.searchParams.get('hub.verify_token'), verifyToken) || !url.searchParams.has('hub.challenge')) return send(403);
        return send(200, url.searchParams.get('hub.challenge'));
      }
      if (req.method !== 'POST') return send(405);
      const raw = await readBody(req);
      if (!validSignature(raw, req.headers['x-hub-signature-256'], appSecret)) return send(401);
      const payload = JSON.parse(raw.toString());
      if (!validPayload(payload)) return send(400, 'Invalid payload');
      for (const message of extractMessages(payload, phoneId)) await service.handle(message);
      return send(200, 'EVENT_RECEIVED');
    } catch (error) {
      // Não expor tokens, corpo de mensagens ou erros do provedor.
      send(error.status || (error instanceof SyntaxError ? 400 : 503), 'Request failed');
    }
  };
}
export { createHandler };

