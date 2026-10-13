// Gerado por npm run build:edge; edite src.
import { respond } from './conversation.mjs';
class MessageService {
  constructor({ store, transport, allowedNumbers, now = Date.now }) { Object.assign(this, { store, transport, allowedNumbers: new Set(allowedNumbers), now }); }
  async handle(message) {
    if (!this.allowedNumbers.has(message.from) || !Number.isFinite(message.timestamp) || this.now() - message.timestamp > 23 * 60 * 60 * 1000 || message.timestamp > this.now() + 5 * 60 * 1000) return;
    await this.store.transaction(async data => {
      const contact = data.contacts[message.from] ||= { state: {}, events: {} };
      // Limitar retenção dos identificadores, mantendo a janela de reentregas do piloto.
      for (const [id, event] of Object.entries(contact.events)) if (event.done && this.now() - event.at > 7 * 86400000) delete contact.events[id];
      let event = contact.events[message.id];
      if (!event) {
        const result = respond(contact.state, message.text.slice(0, 4000));
        contact.state = result.state;
        event = contact.events[message.id] = { at: this.now(), replies: result.replies, sent: 0, done: false };
      }
      // Persistir intenção antes de enviar; reentrega retoma as respostas pendentes.
      await this.store.persist(data);
      while (event.sent < event.replies.length) {
        await this.transport.send(message.from, event.replies[event.sent]);
        event.sent++;
        await this.store.persist(data);
      }
      event.done = true;
    });
  }
  async listRequests() {
    return this.store.transaction(data => Object.entries(data.contacts).map(([contact, record]) => ({ contact, owner: record.state.owner || 'bot', requests: record.state.requests || [] })));
  }
  async setOwner(contactId, owner) {
    if (!['bot', 'human'].includes(owner)) throw Error('Invalid owner');
    await this.store.transaction(data => {
      const contact = data.contacts[contactId] ||= { state: {}, events: {} };
      contact.state.owner = owner;
    });
  }
}
export { MessageService };

