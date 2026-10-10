const http = require('node:http');
const { FileStore } = require('./infrastructure/store.cjs');
const { MetaTransport } = require('./infrastructure/meta.cjs');
const { MessageService } = require('./application/handle-message.cjs');
const { createHandler } = require('./http/handler.cjs');
async function start(env = process.env) {
  for (const key of ['META_VERIFY_TOKEN', 'META_APP_SECRET', 'META_ACCESS_TOKEN', 'META_PHONE_NUMBER_ID', 'META_GRAPH_VERSION', 'WHATSAPP_ALLOWED_NUMBERS', 'ADMIN_TOKEN']) if (!env[key]?.trim()) throw Error(`Missing ${key}`);
  const allowedNumbers = env.WHATSAPP_ALLOWED_NUMBERS.split(',').map(x => x.trim());
  if (allowedNumbers.some(x => !/^\d{7,15}$/.test(x))) throw Error('Invalid allowed numbers');
  const store = await FileStore.open(env.DATA_FILE || 'data/pilot.json');
  const transport = new MetaTransport({ token: env.META_ACCESS_TOKEN, phoneId: env.META_PHONE_NUMBER_ID, version: env.META_GRAPH_VERSION });
  const service = new MessageService({ store, transport, allowedNumbers });
  const server = http.createServer(createHandler({ service, verifyToken: env.META_VERIFY_TOKEN, appSecret: env.META_APP_SECRET, phoneId: env.META_PHONE_NUMBER_ID, adminToken: env.ADMIN_TOKEN }));
  server.requestTimeout = 30000;
  server.listen(Number(env.PORT || 3000), () => console.log('WhatsApp pilot listening'));
  return server;
}
if (require.main === module) start().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { start };
