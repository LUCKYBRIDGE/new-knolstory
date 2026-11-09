/** No DB, account or provider: actual shared proof verifier and two-request buckets. */
import {createServer} from 'node:http';
import {readFileSync,statSync} from 'node:fs';
import {createClientBucketVerifier} from '/app/http/client-bucket-proof.mjs';
const keyPath='/run/fixture-proof-key';
const verify=createClientBucketVerifier({key:readFileSync(keyPath,'utf8').trim(),origin:'https://story.knolquiz.com'});
const buckets=new Map();let total=0,invalid=0;
const server=createServer((req,res)=>{
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
 if(req.url==='/health/live'){res.end('{"live":true}');return;}
 if(req.url==='/measurement'){
  const stat=statSync(keyPath);
  res.end(JSON.stringify({total,invalid,bucketCounts:[...buckets.values()].sort(),uid:process.getuid(),gid:process.getgid(),keyUid:stat.uid,keyMode:stat.mode&0o777,keyRead:true}));return;
 }
 total++;const bucket=verify(req);
 if(bucket===null){invalid++;res.statusCode=403;res.end('{"accepted":false}');return;}
 const count=(buckets.get(bucket)??0)+1;buckets.set(bucket,count);
 res.statusCode=count>2?429:200;res.end(JSON.stringify({accepted:count<=2}));
});
server.listen(4000,'0.0.0.0',()=>console.info('Isolated proof verifier listening.'));
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{server.closeAllConnections();server.close(()=>process.exit(0));});
