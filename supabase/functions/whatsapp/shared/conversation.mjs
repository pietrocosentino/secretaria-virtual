// Gerado por npm run build:edge; edite src.
import { normalize, startPurchase, readPurchase } from './purchase.mjs';
const menu = 'Olá! Sou a Secretária. Posso ajudar com serviços e planos ou encaminhar sua solicitação ao profissional. O que você procura?';
function respond(previous = {}, text) {
  const state = structuredClone(previous), n = normalize(text);
  if (!n) return { state, replies: [] };
  if (state.owner === 'human' || state.owner === 'waiting') return { state, replies: [] };
  if (state.purchase) {
    const result = readPurchase(state.purchase, text);
    if (result.cancelled) delete state.purchase;
    else if (result.confirmed) {
      state.requests = [...(state.requests || []), { kind: 'purchase', ...result.draft }];
      delete state.purchase;
      state.owner = 'waiting';
    } else state.purchase = { draft: result.draft, step: result.step };
    return { state, replies: [result.reply] };
  }
  if (/^(oi|ola|menu|voltar)$/.test(n)) return { state, replies: [menu] };
  if (/contrat|consultoria|plano|servico|treinar/.test(n)) {
    const start = startPurchase();
    const result = /(?:para|pra)\s+(?:mim|minha|meu|meus)/.test(n) ? readPurchase(start, text) : start;
    state.purchase = { draft: result.draft, step: result.step };
    return { state, replies: [result.reply] };
  }
  // Não armazenar relatos médicos no piloto do canal real.
  state.owner = 'waiting';
  state.requests = [...(state.requests || []), { kind: 'human' }];
  return { state, replies: ['Sua solicitação aguarda atendimento do profissional. Agendamentos, pagamentos e orientações de saúde precisam ser confirmados por ele.'] };
}
export { respond };

