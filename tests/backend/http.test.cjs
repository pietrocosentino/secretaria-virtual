const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises'), os = require('node:os'), path = require('node:path');
const { fixture, payload, contact } = require('./fixtures.cjs');
const { FileStore } = require('../../src/infrastructure/store.cjs');
const { MetaTransport } = require('../../src/infrastructure/meta.cjs');
test('HTTP: verificação GET devolve challenge somente com token correto', async t => {
  const f = await fixture(); t.after(() => f.close());
  const good = await fetch(f.base + '/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=fixture-token&hub.challenge=123');
  assert.equal(good.status, 200); assert.equal(await good.text(), '123');
  assert.equal((await fetch(f.base + '/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123')).status, 403);
});
test('HTTP: assinatura inválida não altera estado nem envia mensagem', async t => {
  const f = await fixture(); t.after(() => f.close());
  assert.equal((await f.post(payload('bad'), 'sha256=' + '0'.repeat(64))).status, 401);
  assert.equal(f.sent.length, 0); assert.deepEqual(f.store.data.contacts, {});
});
test('HTTP: payload inválido é recusado', async t => {
  const f = await fixture(); t.after(() => f.close()); assert.equal((await f.post('{')).status, 400);
});
test('HTTP: reentrega não duplica resposta ou pedido', async t => {
  const f = await fixture(); t.after(() => f.close());
  const texts = ['contratar plano', 'para minha esposa online 3 vezes hipertrofia', 'mensal', 'sim'];
  for (let i = 0; i < texts.length; i++) {
    const p = payload('flow-' + i, texts[i]); assert.equal((await f.post(p)).status, 200); assert.equal((await f.post(p)).status, 200);
  }
  assert.equal(f.sent.length, 4); assert.equal(f.store.data.contacts[contact].state.requests.length, 1);
});
test('HTTP: status e mensagens de outro número comercial são ignorados', async t => {
  const f = await fixture(); t.after(() => f.close());
  const p = payload('other'); p.entry[0].changes[0].value.metadata.phone_number_id = '999';
  assert.equal((await f.post(p)).status, 200);
  assert.equal((await f.post({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { statuses: [{ status: 'delivered' }] } }] }] })).status, 200);
  assert.equal(f.sent.length, 0);
});
test('HTTP: piloto ignora destinatários fora da lista e eventos antigos', async t => {
  const f = await fixture(); t.after(() => f.close());
  await f.post(payload('not-allowed', 'oi', '5511888880000'));
  await f.post(payload('old', 'oi', contact, Date.now() - 86400000)); assert.equal(f.sent.length, 0);
});
test('HTTP: falha de envio permite retomar sem aplicar transição novamente', async t => {
  let calls = 0;
  const f = await fixture({ transport: { async send() { if (++calls === 1) throw Error('provider down'); return 'sent'; } } }); t.after(() => f.close());
  const p = payload('retry', 'contratar plano');
  assert.equal((await f.post(p)).status, 503); assert.equal((await f.post(p)).status, 200);
  assert.equal(f.store.data.contacts[contact].state.purchase.step, 'who'); assert.equal(calls, 2);
});
test('HTTP: controle humano exige credencial e preserva pausa', async t => {
  const f = await fixture(); t.after(() => f.close());
  const call = token => fetch(f.base + '/admin/owner', { method: 'POST', headers: { authorization: token, 'Content-Type': 'application/json' }, body: JSON.stringify({ contact, owner: 'human' }) });
  assert.equal((await call('Bearer wrong')).status, 401); assert.equal((await call('Bearer fixture-admin')).status, 200);
  await f.post(payload('paused')); assert.equal(f.sent.length, 0);
});
test('integration: estado e deduplicação persistem após reabrir arquivo', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'secretaria-test-')); t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const filename = path.join(directory, 'state.json');
  const first = await fixture({ store: await FileStore.open(filename) });
  await first.post(payload('persistent', 'contratar plano')); await first.close();
  const next = await fixture({ store: await FileStore.open(filename) }); t.after(() => next.close());
  await next.post(payload('persistent', 'contratar plano')); assert.equal(next.sent.length, 0); assert.equal(next.store.data.contacts[contact].state.purchase.step, 'who');
});
test('adapter: Meta usa endpoint configurado e formato de mensagem de texto', async () => {
  let request;
  const adapter = new MetaTransport({ token: 'test-token', phoneId: '123', version: 'v99.0', fetchImpl: async (url, options) => { request = { url, options }; return { ok: true, json: async () => ({ messages: [{ id: 'wamid.test' }] }) }; } });
  assert.equal(await adapter.send(contact, 'Olá'), 'wamid.test');
  assert.equal(request.url, 'https://graph.facebook.com/v99.0/123/messages');
  assert.equal(JSON.parse(request.options.body).text.body, 'Olá');
});

test('HTTP: consultas de pedidos só são acessíveis ao operador autenticado', async t => {
  const f = await fixture(); t.after(() => f.close());
  await f.post(payload('operator', 'contratar plano'));
  assert.equal((await fetch(f.base + '/admin/requests')).status, 401);
  const response = await fetch(f.base + '/admin/requests', { headers: { authorization: 'Bearer fixture-admin' } });
  assert.equal(response.status, 200);
  assert.equal((await response.json())[0].contact, contact);
});
