import { respond } from './conversation.mjs';
export class MessageService {
 constructor({store,transport,allowedNumbers,now=Date.now}){Object.assign(this,{store,transport,allowedNumbers:new Set(allowedNumbers),now});}
 async deliver(data,contact,event){await this.store.persist(data);while(event.sent<event.replies.length){await this.transport.send(contact,event.replies[event.sent]);event.sent++;await this.store.persist(data);}event.done=true;}
 async handle(message){
  if(!this.allowedNumbers.has(message.from)||!Number.isFinite(message.timestamp)||this.now()-message.timestamp>23*3600000||message.timestamp>this.now()+300000)return;
  await this.store.transaction(async data=>{data.contacts||={};const contact=data.contacts[message.from]||={state:{},events:{}};contact.events||={};
   for(const [id,event] of Object.entries(contact.events))if(event.done&&this.now()-event.at>7*86400000)delete contact.events[id];
   let event=contact.events[message.id];
   if(!event){const result=respond(contact.state,(message.text||'').slice(0,4000),{now:this.now(),media:message.media});contact.state=result.state;contact.lastInboundAt=message.timestamp;
    event=contact.events[message.id]={at:this.now(),replies:result.replies,sent:0,done:false};
    contact.state.history=[...(contact.state.history||[]),{at:this.now(),direction:'incoming',type:message.media?.type||'text',text:message.media?undefined:message.text},...result.replies.map(text=>({at:this.now(),direction:'outgoing',text}))].slice(-100);
   }
   await this.deliver(data,message.from,event);
  });
 }
 async listRequests(){return this.store.transaction(data=>Object.entries(data.contacts||{}).map(([contact,r])=>({contact,owner:r.state.owner||'bot',profile:r.state.profile||{},requests:r.state.requests||[],history:r.state.history||[]})));}
 ensureContact(data,id){if(!/^\d{7,15}$/.test(id||'')||!this.allowedNumbers.has(id)){const e=Error('Contact not allowed');e.status=400;throw e;}data.contacts||={};return data.contacts[id]||={state:{},events:{}};}
 async setOwner(id,owner){if(!['bot','human'].includes(owner))throw Error('Invalid owner');await this.store.transaction(data=>{const c=this.ensureContact(data,id);c.state.owner=owner;c.state.lastActivityAt=this.now();c.state.warned=false;});}
 async adminAction(body){
  await this.store.transaction(async data=>{
   const c=this.ensureContact(data,body.contact),s=c.state;s.profile||={};c.events||={};
   if(!['profile','payment','resolve','reply'].includes(body.action)){const e=Error('Invalid action');e.status=400;throw e;}
   if(body.action==='profile'){
    const p=body.profile||{};for(const k of ['name','email'])if(p[k]!==undefined){if(typeof p[k]!=='string'||p[k].length>250)throw Object.assign(Error('Invalid profile'),{status:400});s.profile[k]=p[k];}
    if(p.plan){if(typeof p.plan.name!=='string'||!p.plan.name.trim())throw Object.assign(Error('Invalid plan'),{status:400});s.profile.plan={};for(const k of ['name','modality','start','end','nextTraining'])if(p.plan[k]!==undefined){if(typeof p.plan[k]!=='string'||p.plan[k].length>250)throw Object.assign(Error('Invalid plan'),{status:400});s.profile.plan[k]=p.plan[k];}s.profile.plan.suspended=p.plan.suspended===true;}
   }else if(body.action==='payment'){
    if(!['confirmed','pending'].includes(body.status)||typeof body.reference!=='string'||!body.reference.trim()||body.reference.length>250)throw Object.assign(Error('Payment reference required'),{status:400});
    s.profile.payment={status:body.status,reference:body.reference,confirmedBy:'professional',at:this.now()};if(s.profile.plan)s.profile.plan.suspended=body.status==='pending';
   }else if(body.action==='resolve'){
    const item=(s.requests||[]).find(r=>r.id===body.requestId);if(!item)throw Object.assign(Error('Unknown request'),{status:404});item.status='resolved';item.resolvedAt=this.now();
   }else {
    if(typeof body.text!=='string'||!body.text.trim()||body.text.length>4000||typeof body.messageId!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(body.messageId))throw Object.assign(Error('Invalid reply'),{status:400});
    if(!Number.isFinite(c.lastInboundAt)||this.now()-c.lastInboundAt>23*3600000)throw Object.assign(Error('Conversation window expired'),{status:409});
    const id='admin-'+body.messageId;let e=c.events[id];if(!e){e=c.events[id]={at:this.now(),replies:[body.text],sent:0,done:false};s.history=[...(s.history||[]),{at:this.now(),direction:'professional',text:body.text}].slice(-100);}s.owner='human';s.lastActivityAt=this.now();s.warned=false;await this.deliver(data,body.contact,e);
   }
  });
 }
 async tick(){
  await this.store.transaction(async data=>{for(const [id,c] of Object.entries(data.contacts||{})){
   const s=c.state;if(s.owner!=='human'||!Number.isFinite(s.lastActivityAt))continue;
   const elapsed=this.now()-s.lastActivityAt;
   if(!Number.isFinite(c.lastInboundAt)||this.now()-c.lastInboundAt>23*3600000){if(elapsed>=15*60000){s.owner='bot';s.warned=false;}continue;}
   let key,text;if(elapsed>=15*60000){key=`close-${s.lastActivityAt}`;text='Atendimento humano encerrado por inatividade. Pendências preservadas. Digite “menu” para retomar o assistente.';}
   else if(elapsed>=10*60000){key=`warn-${s.lastActivityAt}`;text='Deseja encerrar ou continuar este atendimento? Sem atividade, ele encerra aos 15 minutos. Digite “continuar” ou “encerrar”.';}
   else continue;
   c.events||={};const e=c.events[key]||={at:this.now(),replies:[text],sent:0,done:false};await this.deliver(data,id,e);
   if(elapsed>=15*60000){s.owner='bot';s.warned=false;}else s.warned=true;
  }});
 }
}
