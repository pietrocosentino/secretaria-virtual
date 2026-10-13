import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { handleRequest } from '../supabase/functions/whatsapp/handler.mjs';
import { respond, VERSION } from '../supabase/functions/whatsapp/shared/conversation.mjs';
const forbidden={store:{transaction(){throw Error('Real database accessed');}},transport:{send(){throw Error('Real message sent');}}};
const base='https://example.test/functions/v1/whatsapp/homologacao';
async function simulate(state,text){return handleRequest(new Request(base+'/simular',{method:'POST',body:JSON.stringify({state,text,now:100000000})}),{},forbidden);}
test('página de homologação abre sem configuração e script tem sintaxe válida',async()=>{const r=await handleRequest(new Request(base),{},forbidden);assert.equal(r.status,200);assert.equal(r.headers.get('x-bot-version'),VERSION);assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);const html=await r.text();assert.match(html,/apenas dados fictícios/);new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);});
test('simulador executa exatamente o motor publicado sem banco ou Meta',async()=>{const r=await simulate({},'menu');assert.equal(r.status,200);const body=await r.json();assert.deepEqual(body,{...respond({},'menu',{now:100000000}),version:VERSION});const next=await simulate(body.state,'1');assert.match((await next.json()).replies[0],/R\$ 500/);});
test('estado administrativo fictício não confirma pagamento em produção',async()=>{const r=await simulate({profile:{payment:{status:'confirmed'}}},'anamnese');assert.equal(r.status,200);assert.equal((await r.json()).state.step,'anamnese-consent');});
test('dados inválidos e payload grande são rejeitados',async()=>{const invalid=await handleRequest(new Request(base+'/simular',{method:'POST',body:'{}'}),{},forbidden);assert.equal(invalid.status,400);assert.equal(invalid.headers.get('Access-Control-Allow-Origin'),'*');const large=await handleRequest(new Request(base+'/simular',{method:'POST',body:'x'.repeat(300000)}),{},forbidden);assert.equal(large.status,413);});

test('interface com layout anterior troca menus e executa botões no motor real',async()=>{
 const response=await handleRequest(new Request(base),{},forbidden),html=await response.text();
 assert.match(html,/class="workspace"/);assert.match(html,/Painel do personal/);
 function el(){return {value:'',textContent:'',children:[],dataset:{},style:{},classList:{toggle(){}},setAttribute(){},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},get scrollHeight(){return this.children.length;}};}
 const nodes={scenario:{...el(),value:'lead'}},document={getElementById:id=>nodes[id]??=el(),createElement:()=>el(),createTextNode:text=>({textContent:text}),querySelectorAll:()=>[]};
 const sandbox=vm.createContext({document,Date,structuredClone,JSON,console,setTimeout,fetch:async(url,options)=>handleRequest(new Request(base+'/simular',options),{},forbidden)});
 vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],sandbox);
 await new Promise(r=>setTimeout(r,20));
 const lead=nodes.choices.children.map(x=>x.textContent);assert.ok(lead.includes('Conhecer serviços e planos'));assert.ok(!lead.includes('Minhas aulas'));
 nodes.scenario.value='student';nodes.scenario.onchange();await new Promise(r=>setTimeout(r,20));
 const student=nodes.choices.children.map(x=>x.textContent);assert.ok(student.includes('Minhas aulas'));assert.ok(student.includes('Contratar serviços'));
 nodes.choices.children.find(x=>x.textContent==='Minhas aulas').onclick();await new Promise(r=>setTimeout(r,20));assert.ok(nodes.choices.children.some(x=>x.textContent==='Solicitar agendamento'));
});
