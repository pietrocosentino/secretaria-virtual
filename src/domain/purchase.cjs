const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const plans = {
  mensal: 'Mensal: R$ 500', trimestral: 'Trimestral: 3 × R$ 270',
  semestral: 'Semestral: 6 × R$ 255', anual: 'Anual: 12 × R$ 240'
};
const question = draft => !draft.beneficiary ? 'who' : !draft.goal ? 'goal' : !draft.frequency ? 'frequency' : !draft.modality ? 'modality' : 'duration';
const prompts = {
  who: 'Para quem seria o acompanhamento?', goal: 'Qual é o principal objetivo dessa pessoa?',
  frequency: 'Quantas vezes por semana pretende treinar? Informe de 1 a 7, ou diga que ainda não sabe.',
  modality: 'Prefere atendimento presencial ou consultoria online?'
};
function summary(draft) {
  return `Confira o pedido:\nPara: ${draft.beneficiary}\nObjetivo: ${draft.goal}\nFrequência: ${draft.frequency}\nModalidade: ${draft.modality}\nPlano: ${draft.plan}\n\nO método depende da avaliação individual do profissional. Seu plano atual permanece separado. Posso encaminhar? Responda “sim”, “corrigir” ou “cancelar”.`;
}
function startPurchase() { return { draft: {}, step: 'who', reply: prompts.who }; }
function readPurchase(current, text) {
  const n = normalize(text), draft = { ...current.draft };
  if (/^(menu|cancelar|voltar)$/.test(n)) return { cancelled: true, reply: 'Solicitação cancelada, sem contratação ou cobrança.' };
  if (current.step === 'confirm') {
    if (/^(sim|confirmo|confirmar|pode seguir|certo|ok)[.!]*$/.test(n)) return { ...current, confirmed: true, reply: 'Interesse registrado para o profissional. Nenhuma contratação, cobrança ou reserva foi confirmada.' };
    if (/corrig|alter/.test(n) || /^nao[.!]*$/.test(n)) return startPurchase();
    return { ...current, reply: 'Não registrei o pedido. Confirme apenas com “sim”, ou escreva “corrigir” ou “cancelar”.' };
  }
  if (current.step === 'duration') {
    const duration = Object.keys(plans).find(key => new RegExp(`\\b${key}\\b`).test(n));
    if (!duration) return { ...current, reply: 'Qual duração: mensal, trimestral, semestral ou anual?' };
    draft.plan = duration;
    return { draft, step: 'confirm', reply: summary(draft) };
  }
  if (current.step === 'who' && /^(sim|nao|ok|talvez|nao sei)[.!?]*$/.test(n)) return { ...current, reply: prompts.who };
  const relative = n.match(/(?:para|pra)\s+(mim|minha esposa|meu esposo|meu marido|minha mae|meu pai|meus pais|meu filho|minha filha)/);
  if (relative) draft.beneficiary = relative[1] === 'mim' ? 'Para mim' : relative[1];
  if (/\bonline\b|on-line|distancia/.test(n)) draft.modality = 'Online';
  else if (/\bpresencial\b/.test(n)) draft.modality = 'Presencial';
  const frequency = n.match(/\b([1-7])\s*(?:x|vez(?:es)?|dias?)\b/);
  const words = { uma: 1, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7 };
  const wordFrequency = n.match(/\b(uma|duas|tres|quatro|cinco|seis|sete)\s*(?:vez|vezes|dia|dias)\b/);
  if (frequency || wordFrequency) draft.frequency = frequency ? Number(frequency[1]) : words[wordFrequency[1]];
  if (/hipertrof|ganhar.*(?:massa|musculo)/.test(n)) draft.goal = 'Hipertrofia';
  else if (/emagrec|perder.*(?:peso|gordura)/.test(n)) draft.goal = 'Emagrecimento';
  else if (/qualidade|autonomia|saude/.test(n)) draft.goal = 'Qualidade de vida e autonomia';
  else if (/performance|desempenho/.test(n)) draft.goal = 'Performance';
  if (current.step === 'who' && !draft.beneficiary) draft.beneficiary = text.trim();
  if (current.step === 'goal' && !draft.goal) draft.goal = text.trim();
  if (current.step === 'frequency' && !draft.frequency) {
    if (/^[1-7]$/.test(n)) draft.frequency = Number(n);
    else if (/nao sei/.test(n)) draft.frequency = 'A definir';
    else return { ...current, reply: prompts.frequency };
  }
  if (current.step === 'modality' && !draft.modality && /nao sei/.test(n)) draft.modality = 'A definir';
  const step = question(draft);
  if (step !== 'duration') return { draft, step, reply: prompts[step] };
  if (draft.modality !== 'Online') {
    draft.plan = 'Orçamento pendente';
    return { draft, step: 'confirm', reply: 'Valores e disponibilidade precisam ser confirmados pelo profissional.\n' + summary(draft) };
  }
  return { draft, step: 'duration', reply: 'Valores de referência; a frequência orienta o planejamento, sem mudar estes preços.\n' + Object.values(plans).join('\n') + '\nQual duração você prefere?' };
}
module.exports = { normalize, startPurchase, readPurchase };
