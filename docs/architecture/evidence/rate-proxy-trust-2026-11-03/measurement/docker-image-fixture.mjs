/** Executed through stdin from /app in the isolated minimal Dockerfile image. */
import {request} from 'node:http';
import {createProductionIngress,listenProductionIngress} from './operations/production-ingress.mjs';
const config={port:0,host:'127.0.0.1',staticRoot:'/site',publicOrigin:'https://story.knolquiz.com',apiOrigin:'http://127.0.0.1:1'};
const server=await createProductionIngress(config);
await listenProductionIngress(server,config);
try{
 const result=await new Promise((resolve,reject)=>{
  const req=request({host:'127.0.0.1',port:server.address().port,headers:{host:'story.knolquiz.com'}},res=>{
   let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,body}));res.on('error',reject);
  });req.on('error',reject);req.setTimeout(3000,()=>req.destroy(Error('Fixture timeout')));req.end();
 });
 if(result.status!==200||result.body!=='Local rate-trust packaging fixture')throw Error('Fixture differs');
 console.log(JSON.stringify({uid:process.getuid(),node:process.version,mode:'defaultTCP',status:result.status,bodyMatches:true,scope:'Minimal fixture image package check only; no production activation.'}));
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
