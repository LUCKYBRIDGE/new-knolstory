/** The socket path is known to both principals; access must depend on OS permissions. */
import {request} from 'node:http';
const denied=process.getuid()===1001;
const send=(headers)=>new Promise((resolve,reject)=>{
 const req=request({socketPath:'/shared/private/ingress.sock',path:'/api/v1/me',headers:{host:'story.knolquiz.com',...headers}},res=>{let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(body)}));});req.on('error',reject);req.end();
});
if(denied){
 try{await send({'cf-connecting-ip':'192.0.2.10','x-knolstory-client-proof':'forged'});throw Error('Unexpected access by another UID.');}
 catch(error){if(error.code!=='EACCES')throw error;console.log(JSON.stringify({uid:process.getuid(),socketDenied:true,errorCode:error.code,forgedHeaderNeverReachedIngress:true}));}
}else{
 const first=await send({'cf-connecting-ip':'192.0.2.10','x-knolstory-client-proof':'forged'}),second=await send({'cf-connecting-ip':'192.0.2.10'}),other=await send({'cf-connecting-ip':'198.51.100.20'});
 if([first,second,other].some(r=>r.status!==200||!r.body.proofVerified||r.body.containsRawIp)||first.body.identity!==second.body.identity||first.body.identity===other.body.identity)throw Error('The actual shared-socket proof or stable identity did not verify.');
 console.log(JSON.stringify({uid:process.getuid(),allowed:true,allProofsVerified:true,sameClientStable:true,differentClientsDistinct:true,inheritedProofReplaced:true,requestCounts:[first.body.requestCount,second.body.requestCount,other.body.requestCount]}));
}
