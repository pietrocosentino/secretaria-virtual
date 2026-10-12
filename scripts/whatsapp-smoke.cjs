// Teste opcional de envio real: usa apenas o destinatário autorizado definido no ambiente.
const { MetaTransport } = require('../src/infrastructure/meta.cjs');
async function main() {
  const recipient = process.env.WHATSAPP_TEST_RECIPIENT;
  const allowed = (process.env.WHATSAPP_ALLOWED_NUMBERS || '').split(',').map(x => x.trim());
  if (!recipient || !allowed.includes(recipient)) throw Error('Configure WHATSAPP_TEST_RECIPIENT na lista autorizada');
  const transport = new MetaTransport({ token: process.env.META_ACCESS_TOKEN, phoneId: process.env.META_PHONE_NUMBER_ID, version: process.env.META_GRAPH_VERSION });
  const id = await transport.send(recipient, 'Teste de integração da Secretária. Responda “oi” para verificar o atendimento pelo webhook.');
  console.log('Meta aceitou o envio. ID:', id);
  console.log('Confirme a chegada no celular e responda oi. Aceite pela API não comprova entrega.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
