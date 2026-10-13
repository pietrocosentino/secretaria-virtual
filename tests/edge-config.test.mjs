import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../supabase/functions/whatsapp/handler.mjs';
test('verifica todas as rotas com ambas as convenções de variável', async () => {
  for (const key of ['META_VERIFY_TOKEN', 'WHATSAPP_VERIFY_TOKEN']) {
    for (const route of ['', '/webhook', '/webhooks/whatsapp']) {
      const response = await handleRequest(new Request('https://example.test/functions/v1/whatsapp' + route + '?hub.mode=subscribe&hub.verify_token=test-token&hub.challenge=123'), { [key]: 'test-token' });
      assert.equal(response.status, 200);
      assert.equal(await response.text(), '123');
    }
  }
});
test('token incorreto continua rejeitado', async () => {
  const response = await handleRequest(new Request('https://example.test/functions/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123'), { META_VERIFY_TOKEN: 'correct' });
  assert.equal(response.status, 403);
});
test('configuração ausente continua bloqueada', async () => {
  const response = await handleRequest(new Request('https://example.test/functions/v1/whatsapp', { method: 'POST', body: '{}' }), {});
  assert.equal(response.status, 503);
});
