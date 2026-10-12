import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { handleRequest } from '../../supabase/functions/whatsapp/handler.mjs';
import { SupabaseStore } from '../../supabase/functions/whatsapp/shared/store.mjs';
import { MemoryStore } from '../../src/infrastructure/store.cjs';
const env = { META_VERIFY_TOKEN: 'verify', META_APP_SECRET: 'secret', META_ACCESS_TOKEN: 'access', META_PHONE_NUMBER_ID: '123', META_GRAPH_VERSION: 'v25.0', WHATSAPP_ALLOWED_NUMBERS: '5511999990000', ADMIN_TOKEN: 'admin', SUPABASE_URL: 'https://example.test', SUPABASE_SERVICE_ROLE_KEY: 'fixture-key' };
const base = 'https://example.test/functions/v1/whatsapp';
test('Edge: challenge da Meta passa sem JWT', async () => {
  const response = await handleRequest(new Request(base + '?hub.mode=subscribe&hub.verify_token=verify&hub.challenge=987'), env);
  assert.equal(response.status, 200); assert.equal(await response.text(), '987');
});
test('Edge: configuração incompleta falha fechada', async () => {
  assert.equal((await handleRequest(new Request(base), {})).status, 503);
});
test('Edge: POST sem assinatura é recusado antes de acessar banco', async () => {
  assert.equal((await handleRequest(new Request(base, { method: 'POST', body: '{}' }), env)).status, 401);
});
test('Edge: webhook assinado usa regras reais e deduplica reentrega', async () => {
  const store = new MemoryStore(); const sent = [];
  const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: '123' }, messages: [{ id: 'edge-event', from: '5511999990000', timestamp: String(Math.floor(Date.now()/1000)), type: 'text', text: { body: 'contratar plano' } }] } }] }] });
  const signature = 'sha256=' + createHmac('sha256', 'secret').update(body).digest('hex');
  for (let i=0;i<2;i++) {
    const req = new Request(base, { method: 'POST', headers: { 'x-hub-signature-256': signature }, body });
    assert.equal((await handleRequest(req, env, { store, transport: { async send(to, text) { sent.push({to,text}); } } })).status, 200);
  }
  assert.equal(sent.length, 1); assert.match(sent[0].text, /quem/i);
});
test('Edge: endpoint administrativo continua protegido', async () => {
  assert.equal((await handleRequest(new Request(base + '/admin/requests'), env)).status, 401);
});
test('Store: lease ocupada impede processamento', async () => {
  const store = new SupabaseStore({url: env.SUPABASE_URL, key: 'test', fetchImpl: async () => ({ok: true, json: async () => null})});
  let called = false;
  await assert.rejects(store.transaction(() => { called = true; }), /busy/);
  assert.equal(called, false);
});
test('Store: persistência precede liberação mesmo com falha de envio', async () => {
  const calls = [];
  const store = new SupabaseStore({url: env.SUPABASE_URL, key: 'test', fetchImpl: async (url) => {
    calls.push(url.split('/').pop()); return {ok: true, json: async () => url.endsWith('secretaria_acquire') ? {contacts:{}} : true};
  }});
  await assert.rejects(store.transaction(async data => { await store.persist(data); throw Error('send failed'); }), /send failed/);
  assert.deepEqual(calls, ['secretaria_acquire','secretaria_save','secretaria_release']);
});
test('Store: lease expirada não sobrescreve estado', async () => {
  const store = new SupabaseStore({url: env.SUPABASE_URL, key: 'test', fetchImpl: async url => ({ok:true,json:async()=>url.endsWith('secretaria_acquire') ? {contacts:{}} : false})});
  await assert.rejects(store.transaction(async data => store.persist(data)), /expired/);
});

test('Edge: caminhos internos do gateway são normalizados', async () => {
  assert.equal((await handleRequest(new Request('https://example.test/whatsapp/health'), {})).status, 200);
  const response = await handleRequest(new Request('https://example.test/whatsapp?hub.mode=subscribe&hub.verify_token=verify&hub.challenge=55'), env);
  assert.equal(response.status, 200); assert.equal(await response.text(), '55');
});

test('Edge: diagnóstico indica nome ausente sem expor valores', async () => {
  const response = await handleRequest(new Request(base), {...env, META_APP_SECRET: ''});
  const body = await response.text(); assert.match(body, /missing META_APP_SECRET/);
  assert.ok(!body.includes('fixture-key')); assert.ok(!body.includes('verify'));
});
