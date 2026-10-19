import {appendFileSync,writeFileSync} from 'node:fs';
import type {BrowserContext,Page} from '@playwright/test';

/** Capture the manually created runtime contexts, not just Playwright's unused default page. */
export function nativeDiagnostics(path:string){
 writeFileSync(path,'');
 const record=(type:string,data:Record<string,unknown>)=>appendFileSync(path,`${JSON.stringify({at:new Date().toISOString(),type,...data})}\n`);
 const observe=(page:Page)=>{
  page.on('pageerror',error=>record('pageerror',{url:page.url(),message:error.message,stack:error.stack}));
  page.on('console',message=>{if(message.type()==='error')record('console-error',{url:page.url(),message:message.text(),location:message.location()});});
  page.on('crash',()=>record('crash',{url:page.url()}));
  page.on('requestfailed',request=>record('request-failed',{url:request.url(),failure:request.failure()}));
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())record('navigation',{url:frame.url()});});
 };
 const attach=(context:BrowserContext)=>context.on('page',observe);
 const caught=async(page:Page)=>{
  const session=await page.context().newCDPSession(page),scripts=new Map<string,string>();
  let probeSeen=false;
  session.on('Debugger.scriptParsed',(event:{scriptId:string;url:string})=>scripts.set(event.scriptId,event.url));
  session.on('Debugger.paused',(event:{reason:string;data?:Record<string,unknown>;callFrames:{functionName:string;location:{scriptId:string;lineNumber:number;columnNumber:number}}[]})=>{
   const description=typeof event.data?.description==='string'?event.data.description:'';
   if(description.includes('KnolStory caught-exception probe'))probeSeen=true;
   try{record('debugger-exception',{url:page.url(),reason:event.reason,data:event.data,frames:event.callFrames.slice(0,12).map(frame=>({functionName:frame.functionName,url:scripts.get(frame.location.scriptId),line:frame.location.lineNumber+1,column:frame.location.columnNumber+1}))});}
   finally{void session.send('Debugger.resume').catch(error=>record('debugger-control-error',{message:String(error)}));}
  });
  await session.send('Debugger.enable');
  await session.send('Debugger.setBlackboxPatterns',{patterns:['/runtime/','^wasm:','^chrome-extension:'],skipAnonymous:true});
  await session.send('Debugger.setPauseOnExceptions',{state:'all'});
  await page.evaluate("(() => { try { throw new Error('KnolStory caught-exception probe'); } catch {} })();\n//# sourceURL=knolstory-caught-exception-probe.js");
  if(!probeSeen)throw Error('Caught-exception diagnostic probe was not captured.');
  record('debugger-probe-verified',{url:page.url()});
  return async()=>{try{await session.send('Debugger.setPauseOnExceptions',{state:'none'});await session.detach();}catch(error){record('debugger-cleanup-error',{message:String(error)});}};
 };
 return {attach,record,caught};
}
