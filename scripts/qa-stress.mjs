import assert from 'node:assert/strict';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { respond } from '../supabase/functions/whatsapp/shared/conversation.mjs';
import { splitReplies } from '../supabase/functions/whatsapp/shared/messages.mjs';
import { MessageService } from '../supabase/functions/whatsapp/shared/handle-message.mjs';
import { handleRequest } from '../supabase/functions/whatsapp/handler.mjs';
const count=Number(process.env.QA_ACTIONS||30000),seed=42;
if(!Number.isInteger(count)||count<1||count>100000)throw Error('QA_ACTIONS must be 1..100000');
let rng=seed;const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
const now=1791861000000;
const corpus=['menu','oi','voltar','cancelar','encerrar','sim','não','corrigir','1','2','3','4','5','6','7','8','9','0','anamnese','dor no ombro','cirurgia','uso medicamento','diabetes','hipertrofia','para mim online 3 vezes por semana','para minha esposa online','35 anos','não sei','ontem','agora','5,5','-1','11','mensal','trimestral','semestral','anual','pix','paguei','dificuldade em exercício','sem vídeo','encaminhar','marina@example.com','<script>alert(1)</script>','😀'.repeat(100),'a'.repeat(4000)];
const initial=index=>index%3===0?{}:{profile:{name:'Pessoa fictícia',email:'qa@example.com',plan:{name:'Plano fictício',suspended:index%3===2},payment:{status:index%3===2?'pending':'confirmed'}}};
function metrics(samples,elapsed){const sorted=[...samples].sort((a,b)=>a-b);return {operations:samples.length,elapsedMs:+elapsed.toFixed(2),operationsPerSecond:+(samples.length*1000/elapsed).toFixed(2),p50Ms:+sorted[Math.floor(sorted.length*.50)].toFixed(4),p95Ms:+sorted[Math.floor(sorted.length*.95)].toFixed(4),p99Ms:+sorted[Math.floor(sorted.length*.99)].toFixed(4)};}
const report={generatedAt:new Date().toISOString(),seed,environment:{node:process.version,platform:process.platform,scope:'Local/in-memory; no calls to Meta or production database. Concurrency uses a serialized test store, not live Supabase capacity.'},runs:[],failures:[]};
let state={},samples=[],started=performance.now(),resetIndex=0;
for(let i=0;i<count;i++){
 if(i%150===0)state=initial(resetIndex++);
 const previous=JSON.stringify(state),oldPayment=state.profile?.payment?.status,oldPlan=JSON.stringify(state.profile?.plan);
 const text=corpus[Math.floor(random()*corpus.length)],at=performance.now();
 try{const result=respond(state,text,{now:now+i*1000});samples.push(performance.now()-at);assert.equal(JSON.stringify(state),previous,'Input mutated');assert.ok(Array.isArray(result.replies));assert.ok(result.replies.every(v=>typeof v==='string'));assert.equal(result.state.profile?.payment?.status,oldPayment,'Unverified payment changed');assert.equal(JSON.stringify(result.state.profile?.plan),oldPlan,'Current plan changed');for(const reply of result.replies){const chunks=splitReplies([reply]);assert.equal(chunks.join(''),reply);assert.ok(chunks.every(p=>p.length<=3800));}for(const r of result.state.requests||[])if(['health','anamnese'].includes(r.kind))assert.ok(Number.isFinite(r.consentAt),'Health registered without consent');state=result.state;}
 catch(error){report.failures.push({phase:'engine',action:i,text:text.slice(0,80),error:error.message});break;}
}
report.runs.push({name:'Stateful deterministic engine stress',...metrics(samples,performance.now()-started),sessions:resetIndex});
let data={contacts:{}},queue=Promise.resolve();const store={async persist(next){data=structuredClone(next);},transaction(work){const run=queue.then(async()=>{const next=structuredClone(data),result=await work(next);data=structuredClone(next);return result;});queue=run.catch(()=>{});return run;}};
const numbers=Array.from({length:25},(_,i)=>'551199990'+String(i).padStart(4,'0')),sent=[];
const service=new MessageService({store,transport:{async send(to,text){sent.push({to,text});}},allowedNumbers:numbers,now:()=>now});
started=performance.now();const pending=Array.from({length:1000},(_,i)=>{const id=Math.floor(i/2);return service.handle({id:'load-'+id,from:numbers[id%25],text:'menu',timestamp:now});});
const outcomes=await Promise.allSettled(pending);report.runs.push({name:'Concurrent service delivery and duplicate isolation',requests:1000,simultaneousSubmitted:1000,contacts:25,uniqueMessages:500,sent:sent.length,rejected:outcomes.filter(r=>r.status==='rejected').length,elapsedMs:+(performance.now()-started).toFixed(2)});
try{assert.equal(sent.length,500);assert.ok(outcomes.every(r=>r.status==='fulfilled'));assert.equal(Object.keys(data.contacts).length,25);for(const c of Object.values(data.contacts)){assert.equal(Object.keys(c.events).length,20);assert.equal(c.state.history.length,40);}}catch(error){report.failures.push({phase:'concurrency',error:error.message});}
started=performance.now();samples=[];const forbidden={store:{transaction(){throw Error('Production DB touched');}},transport:{send(){throw Error('Meta touched');}}};
for(let batch=0;batch<50;batch++)await Promise.all(Array.from({length:20},async(_,i)=>{const at=performance.now();const response=await handleRequest(new Request('https://example.test/functions/v1/whatsapp/homologacao/simular',{method:'POST',body:JSON.stringify({state:initial(i),text:'menu',now})}),{},forbidden);try{assert.equal(response.status,200);assert.ok((await response.json()).replies.length);}catch(error){report.failures.push({phase:'isolated-endpoint',error:error.message});}samples.push(performance.now()-at);}));
report.runs.push({name:'Isolated endpoint local concurrency',concurrency:20,...metrics(samples,performance.now()-started)});
report.memory={heapUsedMiB:+(process.memoryUsage().heapUsed/1048576).toFixed(2),rssMiB:+(process.memoryUsage().rss/1048576).toFixed(2)};
report.passed=report.failures.length===0;fs.writeFileSync('docs/qa/resultado-estresse.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
