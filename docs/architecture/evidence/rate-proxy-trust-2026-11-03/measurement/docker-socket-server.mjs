/** Isolated Docker measurement fixture; no production configuration or secrets. */
import {createServer} from 'node:http';
import {lstat} from 'node:fs/promises';
import {createProductionIngress,listenProductionIngress} from '/source/server/operations/production-ingress.mjs';
import {createClientBucketVerifier,CLIENT_BUCKET_HEADER} from '/source/server/http/client-bucket-proof.mjs';
const key='ab'.repeat(32),origin='https://story.knolquiz.com';
const verify=createClientBucketVerifier({key,origin});
let count=0;
const api=createServer((req,res)=>{
 const identity=verify(req);count++;
 res.writeHead(identity?200:403,{'content-type':'application/json'});
 res.end(JSON.stringify({proofVerified:identity!==null,identity,requestCount:count,containsRawIp:typeof req.headers[CLIENT_BUCKET_HEADER]==='string'&&req.headers[CLIENT_BUCKET_HEADER].includes('192.0.2.10')}));
});
await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));
const config={staticRoot:'/fixture',publicOrigin:origin,apiOrigin:`http://127.0.0.1:${api.address().port}`,trustedClient:{socketPath:'/shared/private/ingress.sock',key}};
const ingress=await createProductionIngress(config);await listenProductionIngress(ingress,config);
const parent=await lstat('/shared/private'),socket=await lstat(config.trustedClient.socketPath);
console.log(JSON.stringify({stage:'ready',uid:process.getuid(),node:process.version,parent:{uid:parent.uid,mode:parent.mode&0o777},socket:{uid:socket.uid,mode:socket.mode&0o777,isSocket:socket.isSocket()},network:'none',sourceMountedReadOnly:true,fixtureKeyOnly:true}));
process.once('SIGTERM',()=>{ingress.close(()=>api.close(()=>process.exit(0)));ingress.closeAllConnections();});
