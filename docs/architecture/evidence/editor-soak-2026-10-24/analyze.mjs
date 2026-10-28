import{readFileSync,writeFileSync,existsSync}from'node:fs';import{createHash}from'node:crypto';
const dir='.cache/editor-soak-20261024',state=JSON.parse(readFileSync(`${dir}/state.json`,'utf8'));
if(!['passed','failed'].includes(state.status)){console.log(JSON.stringify({status:state.status,terminal:false}));process.exit(2);}
const samples=readFileSync(`${dir}/metrics.jsonl`,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const warm=samples.filter(s=>s.elapsedMs>=60000),steady=warm.length?warm:samples;
const range=key=>({min:Math.min(...steady.map(s=>s[key])),max:Math.max(...steady.map(s=>s[key])),first:steady[0]?.[key],last:steady.at(-1)?.[key]});
const hashes=JSON.parse(readFileSync('docs/architecture/evidence/editor-integration-2026-10-24/tested-source-hashes.json','utf8'));
const changed=Object.entries(hashes).filter(([path,hash])=>createHash('sha256').update(readFileSync(path)).digest('hex')!==hash).map(([path])=>path);
const file=`${dir}/final.knolstory`;const digest=existsSync(file)?createHash('sha256').update(readFileSync(file)).digest('hex'):null;
const result={terminal:true,...state,sampleCount:samples.length,steadyJsHeapBytes:range('jsHeapUsed'),steadyDomNodes:range('nodes'),candidateSourcesChanged:changed,finalFileSha256:digest,measurementScope:'Main document Chrome Performance metrics sampled without forced GC. Not WASM/GPU/OS memory and not physical Android tablet budget.',passesBoundedSession:state.status==='passed'&&state.elapsedMs>=1800000&&state.cycles>=100&&state.nativeReturns>=10&&state.wholeProjectPreserved===true&&state.finalFileEqual===true&&state.errors.length===0&&changed.length===0&&digest!==null};
writeFileSync(`${dir}/analysis.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(!result.passesBoundedSession)process.exitCode=1;
