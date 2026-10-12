const crypto = require('node:crypto');
const http = require('node:http');
const { MemoryStore } = require('../../src/infrastructure/store.cjs');
const { MessageService } = require('../../src/application/handle-message.cjs');
const { createHandler } = require('../../src/http/handler.cjs');
const secret = 'local-fixture-secret', phoneId = '123456789', contact = '5511999990000';
function payload(id, text = 'oi', from = contact, timestamp = Date.now()) {
  return { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: phoneId }, messages: [{ id, from, type: 'text', timestamp: String(Math.floor(timestamp / 1000)), text: { body: text } }] } }] }] };
}
async function fixture({ transport, store = new MemoryStore(), allowedNumbers = [contact] } = {}) {
  const sent = [];
  const service = new MessageService({ store, allowedNumbers, transport: transport || { async send(to, text) { sent.push({ to, text }); return 'out-' + sent.length; } } });
  const server = http.createServer(createHandler({ service, appSecret: secret, verifyToken: 'fixture-token', phoneId, adminToken: 'fixture-admin' }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function post(body, signature) {
    const raw = typeof body === 'string' ? body : JSON.stringify(body);
    return fetch(base + '/webhooks/whatsapp', { method: 'POST', headers: { 'x-hub-signature-256': signature || 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex') }, body: raw });
  }
  return { base, post, sent, service, store, async close() { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } };
}
module.exports = { fixture, payload, contact, phoneId };
