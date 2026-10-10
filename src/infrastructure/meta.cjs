const crypto = require('node:crypto');
function validSignature(raw, signature, secret) {
  if (!secret || !/^sha256=[a-f0-9]{64}$/.test(signature || '')) return false;
  const expected = crypto.createHmac('sha256', secret).update(raw).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(signature.slice(7), 'hex'));
}
function extractMessages(payload, phoneId) {
  if (payload.object !== 'whatsapp_business_account') return [];
  return (payload.entry || []).flatMap(entry => (entry.changes || []).flatMap(change => {
    const value = change.value;
    if (change.field !== 'messages' || value?.metadata?.phone_number_id !== phoneId) return [];
    return (value.messages || []).filter(m => m.type === 'text' && typeof m.text?.body === 'string' && /^\d{7,15}$/.test(m.from) && typeof m.id === 'string' && m.id.length < 256)
      .map(m => ({ id: m.id, from: m.from, text: m.text.body, timestamp: Number(m.timestamp) * 1000 }));
  }));
}
class MetaTransport {
  constructor({ token, phoneId, version, fetchImpl = fetch }) {
    if (!/^v\d+\.\d+$/.test(version || '') || !/^\d+$/.test(phoneId || '') || !token) throw Error('Missing Meta configuration');
    Object.assign(this, { token, phoneId, version, fetchImpl });
  }
  async send(to, text) {
    const response = await this.fetchImpl(`https://graph.facebook.com/${this.version}/${this.phoneId}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw Error(`Meta send failed (${response.status})`);
    const result = await response.json();
    if (!result.messages?.[0]?.id) throw Error('Meta response missing message id');
    return result.messages[0].id;
  }
}
module.exports = { validSignature, extractMessages, MetaTransport };
