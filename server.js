// Servidor Node e Supabase compartilham as mesmas jornadas e validações.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
function carregarEnv() {
 const arquivo=path.join(__dirname,'.env');if(!fs.existsSync(arquivo))return;
 for(const linha of fs.readFileSync(arquivo,'utf8').split(/\r?\n/)){
  const l=linha.trim();if(!l||l.startsWith('#')||!l.includes('='))continue;
  const i=l.indexOf('='),key=l.slice(0,i).trim(),value=l.slice(i+1).trim().replace(/^["']|["']$/g,'');
  if(!(key in process.env))process.env[key]=value;
 }
}
carregarEnv();
(async()=>{
 const {handleRequest}=await import('./supabase/functions/whatsapp/handler.mjs');
 const server=http.createServer(async(req,res)=>{
  try{
   const chunks=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>1024*1024){res.writeHead(413);res.end('Body too large');return;}chunks.push(chunk);}
   const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/webhook')url.pathname='/whatsapp/webhook';
   if(url.pathname==='/')url.pathname='/whatsapp/health';
   const request=new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
   const response=await handleRequest(request,process.env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(503);res.end('Request failed');}
 });
 server.listen(process.env.PORT||3000,()=>console.log('Secretária Virtual: servidor iniciado. Webhook /webhook; status /health.'));
})().catch(()=>{console.error('Não foi possível iniciar o servidor.');process.exitCode=1;});
