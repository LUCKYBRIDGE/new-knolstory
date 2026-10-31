// Shared measurement flow: open the site, enter the library, open the first built-in story
// and wait until the first Ren'Py scene is rendered. Times are wall-clock milliseconds.
import {expect,type Page} from '@playwright/test';
import {builtinEditions,beginSelectedBook,enterLibrary,openBuiltinEdition} from '../../../../../tests/e2e/library-entry';

type Row={path:string;transfer:number;encoded:number;decoded:number;start:number;end:number};
async function resources(target:Pick<Page,'evaluate'>):Promise<Row[]>{
 return target.evaluate(()=>performance.getEntriesByType('resource').map(entry=>{const r=entry as PerformanceResourceTiming;return {path:new URL(r.name).pathname,transfer:r.transferSize,encoded:r.encodedBodySize,decoded:r.decodedBodySize,start:Math.round(performance.timeOrigin+r.startTime),end:Math.round(performance.timeOrigin+r.responseEnd)};}));
}
export async function flow(page:Page,label:string){
 const opened=Date.now();
 await page.goto('/',{waitUntil:'commit'});
 await enterLibrary(page);
 const library=Date.now();
 const [work,edition]=builtinEditions[0]!;
 await openBuiltinEdition(page,work,edition);
 const clicked=Date.now();
 await beginSelectedBook(page);
 const status=page.getByTestId('story-runtime-status');
 await expect.poll(async()=>{const r=await status.getAttribute('data-rendered-revision');return r!==null&&Number(r)>=0&&r===await status.getAttribute('data-scene-revision');},{timeout:300000,intervals:[100]}).toBe(true);
 const rendered=Date.now();
 const frame=page.frames().find(item=>new URL(item.url()).pathname.startsWith('/runtime/'));
 const rows=[...await resources(page),...(frame?await resources(frame):[])];
 const story=rows.filter(row=>row.start>=clicked-50);
 const runtimeRows=story.filter(row=>row.path.startsWith('/runtime/')&&!row.path.startsWith('/runtime/game/'));
 const lastRuntimeByte=Math.max(0,...runtimeRows.map(row=>row.end));
 const sum=(list:Row[],key:'transfer'|'decoded')=>list.reduce((total,row)=>total+row[key],0);
 const big=(path:string)=>{const row=story.find(item=>item.path===path);return row?{transferKB:Math.round(row.transfer/1024),decodedKB:Math.round(row.decoded/1024),startMs:row.start-clicked,endMs:row.end-clicked}:null;};
 return {label,libraryMs:library-opened,storyMs:rendered-clicked,storyRequests:story.length,storyTransferMB:+(sum(story,'transfer')/1e6).toFixed(2),storyDecodedMB:+(sum(story,'decoded')/1e6).toFixed(2),
  runtimeDownloadEndMs:lastRuntimeByte?lastRuntimeByte-clicked:null,afterDownloadToSceneMs:lastRuntimeByte?rendered-lastRuntimeByte:null,
  files:{'renpy.wasm':big('/runtime/renpy.wasm'),'renpy.data':big('/runtime/renpy.data'),'game.zip':big('/runtime/game.zip'),'renpy.js':big('/runtime/renpy.js')}};
}
