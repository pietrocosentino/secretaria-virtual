// node tests/stress-matrix.cjs --actions=10000 --out=reports
// Exercita lógica local; não mede carga de backend ou usuários de rede.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const args=process.argv.slice(2);
const count=Number(args.find(x=>x.startsWith('--actions='))?.slice(10)||10000);
if(!Number.isInteger(count)||count<1||count>100000)throw Error('actions must be 1..100000');
const out=path.resolve(args.find(x=>x.startsWith('--out='))?.slice(6)||'reports');
fs.mkdirSync(out,{recursive:true});
const runs=[];
for(const seed of [42,2026,8675309]){
 const reportPath=path.join(out,`seed-${seed}.json`);
 const run=spawnSync(process.execPath,[path.join(__dirname,'prototype.test.cjs'),`--stress=${count}`,`--seed=${seed}`,`--report=${reportPath}`],{encoding:'utf8',timeout:120000});
 if(run.error||!fs.existsSync(reportPath)){runs.push({seed,status:'runner-error',error:run.error?.message||run.stderr});continue}
 const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
 runs.push({seed,exitCode:run.status,passed:report.passed,failed:report.failed,actions:report.stressActions,sourceSha256:report.sourceSha256,failures:report.results.filter(x=>x.status==='failed').map(x=>({id:x.id,title:x.title,error:x.error})),stress:report.results.find(x=>x.id==='ST01')});
 console.log(`Semente ${seed}: ${report.passed}/${report.total}; ${report.stressActions} ações; ${report.failed} falhas`);
}
fs.writeFileSync(path.join(out,'resumo.json'),JSON.stringify({generatedAt:new Date().toISOString(),environment:'Node VM + DOM simulado, sem serviços externos',runs},null,2)+'\n');
process.exitCode=runs.some(x=>x.exitCode!==0)?1:0;
