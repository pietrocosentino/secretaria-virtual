// HTTP real em localhost, envio à Meta substituído por adaptador de teste.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { fixture, payload } = require('../tests/backend/fixtures.cjs');
async function main() {
  const reports = [];
  for (const concurrency of [1, 5, 10, 25, 50]) {
    const contacts = Array.from({ length: concurrency }, (_, i) => String(5511999900000 + i));
    const f = await fixture({ allowedNumbers: contacts });
    const times = [];
    try {
      await Promise.all(contacts.map(async (contact, index) => {
        const texts = ['oi', 'contratar plano', `para minha esposa online 3 vezes hipertrofia`, 'mensal', 'sim'];
        for (let step = 0; step < texts.length; step++) {
          const body = payload(`stress-${index}-${step}`, texts[step], contact);
          const start = performance.now();
          assert.equal((await f.post(body)).status, 200);
          times.push(performance.now() - start);
          assert.equal((await f.post(body)).status, 200); // reentrega
        }
      }));
      for (const contact of contacts) {
        assert.equal(f.store.data.contacts[contact].state.requests.length, 1);
        assert.equal(f.sent.filter(m => m.to === contact).length, 5);
      }
      times.sort((a, b) => a - b);
      reports.push({ concurrency, requests: concurrency * 10, messagesSent: f.sent.length, p95Ms: Number(times[Math.ceil(times.length * .95) - 1].toFixed(2)), status: 'passed' });
    } finally { await f.close(); }
  }
  await fs.mkdir('reports', { recursive: true });
  await fs.writeFile('reports/http-stress.json', JSON.stringify({ generatedAt: new Date().toISOString(), scope: 'HTTP localhost + MemoryStore + fake Meta transport, sem tráfego externo', reports }, null, 2));
  console.table(reports);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
