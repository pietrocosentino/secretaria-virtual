const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readPurchase, startPurchase } = require('../../src/domain/purchase.cjs');
const { respond } = require('../../src/domain/conversation.cjs');
function draftToConfirm() {
  let state = startPurchase();
  for (const text of ['para minha esposa online três vezes por semana', 'hipertrofia', 'mensal']) state = readPurchase(state, text);
  return state;
}
test('unit: contratação pede somente dados faltantes e mostra preço após objetivo', () => {
  const state = readPurchase(startPurchase(), 'para minha esposa online três vezes por semana');
  assert.equal(state.step, 'goal'); assert.equal(state.draft.frequency, 3); assert.ok(!state.reply.includes('R$'));
  assert.equal(readPurchase(state, 'hipertrofia').step, 'duration');
});
test('unit: função pura não modifica estado recebido', () => {
  const state = startPurchase(), before = structuredClone(state);
  readPurchase(state, 'para mim'); assert.deepEqual(state, before);
});
test('unit: resposta ambígua mantém pergunta de beneficiário', () => {
  for (const answer of ['sim', 'não', 'ok', 'talvez']) assert.equal(readPurchase(startPurchase(), answer).step, 'who');
});
test('unit: recusa não registra interesse', () => {
  const current = draftToConfirm();
  for (const answer of ['sim, mas não quero contratar ainda', 'sim talvez', 'ok, não confirme']) assert.equal(readPurchase(current, answer).confirmed, undefined);
});
test('unit: confirmação explícita registra somente interesse', () => {
  const result = readPurchase(draftToConfirm(), 'sim'); assert.equal(result.confirmed, true); assert.match(result.reply, /Nenhuma contratação/);
});
test('unit: preço presencial nunca é inventado', () => {
  let state = startPurchase();
  for (const text of ['para meu pai', 'qualidade de vida', '2', 'presencial']) state = readPurchase(state, text);
  assert.equal(state.step, 'confirm'); assert.ok(!state.reply.includes('R$'));
});
test('unit: frequência inválida não avança', () => {
  let state = readPurchase(startPurchase(), 'para mim hipertrofia');
  for (const value of ['0', '9', '-1', '15 vezes']) assert.equal(readPurchase(state, value).step, 'frequency');
});
test('unit: correção substitui frequência sem repetir dados', () => {
  let state = readPurchase(startPurchase(), 'para minha esposa online 3 vezes');
  state = readPurchase(state, '2 vezes, hipertrofia'); assert.equal(state.draft.frequency, 2);
});
test('unit: atendimento humano ou aguardando não recebe respostas do bot', () => {
  for (const owner of ['human', 'waiting']) assert.deepEqual(respond({ owner }, 'oi').replies, []);
});
test('unit: cancelamento não cria pedido', () => {
  const result = respond({ purchase: draftToConfirm() }, 'cancelar');
  assert.equal(result.state.purchase, undefined); assert.equal(result.state.requests, undefined);
});

test('unit: início com dados completos evita repetir beneficiário', () => {
  const result = respond({}, 'quero contratar para minha esposa online três vezes hipertrofia');
  assert.equal(result.state.purchase.step, 'duration');
});
