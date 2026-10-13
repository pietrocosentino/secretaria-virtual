export const normalize = text => String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const plans={mensal:'Mensal: R$ 500',trimestral:'Trimestral: 3 × R$ 270',semestral:'Semestral: 6 × R$ 255',anual:'Anual: 12 × R$ 240'};
export const planPrices=Object.values(plans).join('\n');
const prompts={who:'Para quem seria o acompanhamento?',beneficiary:'Qual é o nome do beneficiário?',age:'Qual é a idade ou faixa etária do beneficiário? Pode dizer “não sei”.',goal:'Qual é o principal objetivo dessa pessoa?',frequency:'Quantas vezes por semana pretende treinar? Informe de 1 a 7 ou diga “não sei”.',modality:'Prefere presencial ou consultoria online? Pode dizer “não sei”.'};
export function startPurchase(profile={}){return {draft:{existingStudent:!!profile.plan},step:'who',reply:profile.plan?'Seu plano atual permanece separado. Para quem seria a nova contratação?':prompts.who};}
function summary(d){return `Confira o pedido:\nBeneficiário: ${d.beneficiary}\nRelação: ${d.relation}\nIdade/faixa: ${d.age||'A informar no cadastro'}\nObjetivo: ${d.goal}\nFrequência: ${d.frequency}\nModalidade: ${d.modality}\nPlano: ${d.plan}\n\nO profissional define o método após avaliação individual. Seu plano atual permanece separado. Nenhuma cobrança ou reserva será criada automaticamente. Posso registrar o interesse? Responda “sim”, “corrigir” ou “cancelar”.`;}
export function readPurchase(current,text,profile={}){const n=normalize(text),d={...current.draft};
 if(current.step==='confirm'){if(/^(sim|confirmo|confirmar|pode seguir|certo|ok)[.!]*$/.test(n))return {draft:d,step:'confirm',confirmed:true};if(/^(nao|corrigir|alterar)[.!]*$/.test(n))return startPurchase(profile);return {draft:d,step:'confirm',reply:'Confirme com “sim”, ou escreva “corrigir” ou “cancelar”.'};}
 if(current.step==='duration'){const plan=Object.keys(plans).find(k=>new RegExp(`\\b${k}\\b`).test(n));if(!plan)return {draft:d,step:'duration',reply:'Qual duração: mensal, trimestral, semestral ou anual?'};d.plan=plan;return {draft:d,step:'confirm',reply:summary(d)};}
 const relation=/^(mim|eu|para mim|pra mim|eu mesmo|eu mesma)$/.test(n)||/\b(?:para|pra) mim\b/.test(n)?'Para mim':/esposa|esposo|marido|conjuge/.test(n)?'Cônjuge':/filh[oa]/.test(n)?'Filho(a)':/minha mae|meu pai|pais/.test(n)?'Pai ou mãe':null;
 if(relation){d.relation=relation;if(relation==='Para mim')d.beneficiary=profile.name||'Para mim';}
 const age=n.match(/\b(\d{1,3})\s*anos\b/);if(age)d.age=age[1]+' anos';
 if(/\bonline\b|on-line|distancia/.test(n))d.modality='Online';else if(/\bpresencial\b/.test(n))d.modality='Presencial';
 const freq=n.match(/\b([1-7])\s*(?:x|vez(?:es)?|dias?)\b/),words={uma:1,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7},wf=n.match(/\b(uma|duas|tres|quatro|cinco|seis|sete)\s*(?:vez|vezes|dia|dias)\b/);if(freq||wf)d.frequency=freq?Number(freq[1]):words[wf[1]];
 if(/hipertrof|ganhar.*(?:massa|musculo)/.test(n))d.goal='Hipertrofia';else if(/emagrec|perder.*(?:peso|gordura)/.test(n))d.goal='Emagrecimento';else if(/qualidade|autonomia|saude/.test(n))d.goal='Qualidade de vida e autonomia';else if(/performance|desempenho/.test(n))d.goal='Performance';
 if(current.step==='who'&&!d.relation){if(/^(sim|nao|ok|nao sei)$/.test(n))return {...current,reply:prompts.who};d.relation='Outra pessoa';d.beneficiary=text.trim();}
 if(current.step==='beneficiary')d.beneficiary=text.trim();
 if(current.step==='age'){if(/\b\d{1,3}\b|anos|adult|idos|crianc|adolesc|nao sei/.test(n))d.age=text.trim();else return {...current,reply:prompts.age};}
 if(current.step==='goal'&&!d.goal)d.goal=text.trim();
 if(current.step==='frequency'&&!d.frequency){if(/^[1-7]$/.test(n))d.frequency=Number(n);else if(/nao sei/.test(n))d.frequency='A definir';else return {...current,reply:prompts.frequency};}
 if(current.step==='modality'&&!d.modality&&/nao sei/.test(n))d.modality='A definir';
 const step=!d.relation?'who':!d.beneficiary?'beneficiary':d.relation!=='Para mim'&&!d.age?'age':!d.goal?'goal':!d.frequency?'frequency':!d.modality?'modality':'duration';
 if(step!=='duration')return {draft:d,step,reply:prompts[step]};
 if(d.modality!=='Online'){d.plan='Orçamento pendente';return {draft:d,step:'confirm',reply:'Valores e disponibilidade precisam de confirmação.\n'+summary(d)};}
 return {draft:d,step:'duration',reply:'Valores de referência. A frequência orienta o planejamento, sem mudar estes preços.\n'+planPrices+'\nQual duração você prefere?'};
}
