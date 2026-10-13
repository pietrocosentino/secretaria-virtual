import { normalize } from './purchase.mjs';
export const healthKinds=['Lesão ou dor','Cirurgia','Medicamento ou substância','Condição de saúde','Restrição ou recomendação','Outra atualização'];
const questions={
 'Lesão ou dor':[['local','Em qual região do corpo? Informe o lado, se aplicável.'],['inicio','Quando começou? Já aconteceu antes?'],['contexto','Aconteceu no treino, em casa, no trabalho ou em outra situação?'],['intensidade','De 0 a 10, qual a intensidade da dor agora? Pode dizer “não sei” ou “sem dor”.'],['impacto','Quais movimentos ou atividades ficaram difíceis?'],['evolucao','A dor aumentou, diminuiu ou ficou igual? Pode dizer “não sei”.'],['orientacao','Há diagnóstico ou orientação profissional que deseja acrescentar? Pode dizer “não”.']],
 'Cirurgia':[['tipo','Qual cirurgia?'],['data','Já ocorreu ou está prevista? Quando?'],['restricao','Existe alguma restrição ou orientação para informar?']],
 'Medicamento ou substância':[['nome','Qual medicamento, hormônio ou substância deseja informar?'],['uso','O uso é atual ou passado?'],['mudanca','É uma informação nova ou uma mudança no que já informou?']],
 'Condição de saúde':[['condicao','Qual condição deseja informar?'],['inicio','Quando tomou conhecimento?'],['mudanca','O que mudou e o que deseja comunicar?']],
 'Restrição ou recomendação':[['relato','Qual restrição ou recomendação deseja informar?'],['data','Desde quando se aplica?']],
 'Outra atualização':[['relato','Qual mudança deseja informar ao profissional?']]
};
export function detectHealth(n){if(/cirurgia|operar|operacao/.test(n))return 'Cirurgia';if(/\b(lesao|lesionei|machuquei|dor)\b/.test(n))return 'Lesão ou dor';if(/restricao|recomendacao/.test(n))return 'Restrição ou recomendação';if(/medicamento|remedio|farmaco|hormonio|anabolizante|danone|bombas?|ciclo|insulina|antidepressivo|ansiolitico|anticoncepcional|termogenico/.test(n))return 'Medicamento ou substância';if(/diabetes|hipertensao|pressao alta|tireoide/.test(n))return 'Condição de saúde';return null;}
export function healthStart(kind,initial=''){return {kind,initial,answers:{},index:0};}
function summary(d){d.confirm=true;return {draft:d,reply:'Confira antes de registrar:\nAssunto: '+d.kind+'\n'+(d.initial?'Relato inicial: '+d.initial+'\n':'')+Object.entries(d.answers).map(([k,v])=>`${k}: ${v}`).join('\n')+'\n\nConfirme com “sim”, escreva “corrigir” ou “cancelar”.'};}
export function healthRead(previous,text){const d=structuredClone(previous),n=normalize(text||'');const q=questions[d.kind];if(!q)throw Error('Unknown health category');
 if(d.confirm){if(/^(sim|confirmar|confirmo|confirmar e encaminhar|ok)[.!]*$/.test(n))return {draft:d,confirmed:true};if(/^(nao|corrigir|corrigir respostas)$/.test(n)){d.answers={};d.index=0;delete d.confirm;return {draft:d,reply:q[0][1]};}return summary(d);}
 if(/profissional|encaminhar/.test(n))return summary(d);
 if(text!==undefined){const key=q[d.index][0];if(key==='intensidade'&&/^-?\d+(?:[.,]\d+)?$/.test(n)){const v=Number(n.replace(',','.'));if(v<0||v>10)return {draft:d,reply:'Informe um número de 0 a 10 ou diga “não sei”.'};}d.answers[key]=text.trim();d.index++;
 // Não perguntar evolução quando o início foi imediato.
 if(q[d.index]?.[0]==='evolucao'&&/^(agora|agora mesmo|neste momento|acabou de acontecer)$/.test(normalize(d.answers.inicio||'')))d.index++;
 }
 return d.index>=q.length?summary(d):{draft:d,reply:q[d.index][1]+'\nPode responder “não sei”, digitar “encaminhar” para resumir ou “cancelar”.'};
}
